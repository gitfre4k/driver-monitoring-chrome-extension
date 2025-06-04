import { inject, Injectable } from '@angular/core';
import { catchError, concatMap, from, mergeMap, of, tap } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { ApiService } from './api.service';
import { ProgressBarService } from './progress-bar.service';
import { ReportComponent } from '../components/report/report.component';

import { ICompany, IDOTInspections, IRange, IViolations } from '../interfaces';
import { TScanMode } from '../types';

@Injectable({
  providedIn: 'root',
})
export class ScanService {
  private apiService: ApiService = inject(ApiService);
  private progressBarService = inject(ProgressBarService);
  private _snackBar = inject(MatSnackBar);

  readonly dialog = inject(MatDialog);

  currentCompany: ICompany = { id: '', name: '' };

  violations = this.progressBarService.violations;
  inspections = this.progressBarService.inspections;
  errors = this.progressBarService.errors;

  constructor() {}

  ngOnInit() {}

  handleScanData(data: IViolations | IDOTInspections, scanMode: TScanMode) {
    this.progressBarService.progressValue.update(
      (value) => value + this.progressBarService.constant()
    );
    if (data.totalCount > 0) {
      this.progressBarService.totalCount.update(
        (totalCount) => totalCount + data.totalCount
      );

      scanMode === 'violations'
        ? this.violations.push({
            company: this.currentCompany.name,
            violations: data as IViolations,
          })
        : this.inspections.push({
            company: this.currentCompany.name,
            inspections: data as IDOTInspections,
          });
    }
  }

  handleError(error: any) {
    this._snackBar
      .open(`An error occurred: ${error.message}`, 'Close')
      .afterDismissed()
      .pipe(tap(() => this.progressBarService.initializeState()))
      .subscribe();
  }

  handleScanComplete(scanMode: TScanMode) {
    const dialogRef = this.dialog.open(ReportComponent);
    let instance = dialogRef.componentInstance;
    scanMode === 'violations'
      ? (instance.violations = this.violations)
      : (instance.inspections = this.inspections);
    dialogRef
      .afterClosed()
      .subscribe(() => this.progressBarService.initializeState());
  }

  getAllViolations(range: IRange) {
    return this.apiService
      .getAccessibleTenants()
      .pipe(
        tap(() => {
          this.progressBarService.scanning.set(true);
        }),
        mergeMap((tenants) => from(tenants))
      )
      .pipe(
        concatMap((tenant) => {
          this.currentCompany = tenant;
          this.progressBarService.currentCompany.set(this.currentCompany.name);
          return this.apiService.getViolations(tenant, range).pipe(
            tap({
              error: (error) => {
                this.progressBarService.progressValue.update(
                  (value) => value + this.progressBarService.constant()
                );
                this.errors.push({ error, company: this.currentCompany });
              },
            }),
            catchError(() => of())
          );
        })
      );
  }

  getAllDOTInspections(range: IRange) {
    return this.apiService.getAccessibleTenants().pipe(
      tap(() => {
        this.progressBarService.scanning.set(true);
      }),
      mergeMap((tenants) => from(tenants)),
      concatMap((tenant) => {
        this.currentCompany = tenant;
        this.progressBarService.currentCompany.set(this.currentCompany.name);
        return this.apiService.getDOTInspectionList(tenant, range).pipe(
          tap({
            error: (error) => {
              this.progressBarService.progressValue.update(
                (value) => value + this.progressBarService.constant()
              );
              this.errors.push({ error, company: this.currentCompany });
            },
          }),
          catchError(() => of())
        );
      })
    );
  }
}
