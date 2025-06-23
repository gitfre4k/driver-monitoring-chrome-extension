import { inject, Injectable } from '@angular/core';
import {
  catchError,
  concatMap,
  from,
  mergeMap,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { ApiService } from './api.service';
import { ProgressBarService } from './progress-bar.service';
import { ReportComponent } from '../components/report/report.component';

import { ICompany, IDOTInspections, IRange, IViolations } from '../interfaces';
import { TScanMode } from '../types';
import { ExtensionTabNavigationService } from './extension-tab-navigation.service';

@Injectable({
  providedIn: 'root',
})
export class ScanService {
  private apiService: ApiService = inject(ApiService);
  private progressBarService = inject(ProgressBarService);
  private extensionTabNavService = inject(ExtensionTabNavigationService);
  private _snackBar = inject(MatSnackBar);

  readonly dialog = inject(MatDialog);

  currentCompany: ICompany = { id: '', name: '' };

  constructor() {}

  ngOnInit() {}

  handleScanData(data: IViolations | IDOTInspections, scanMode: TScanMode) {
    this.progressBarService.progressValue.update(
      (value) => value + this.progressBarService.constant()
    );
    if (data.totalCount > 0) {
      this.progressBarService[
        scanMode === 'violations' ? 'totalVCount' : 'totalDCount'
      ].update((totalCount) => totalCount + data.totalCount);

      scanMode === 'violations'
        ? this.progressBarService.violations.update((v) => [
            ...v,
            {
              company: this.currentCompany.name,
              tenant: {
                id: this.currentCompany.id,
                name: this.currentCompany.name,
              },
              violations: data as IViolations,
            },
          ])
        : this.progressBarService.inspections.push({
            company: this.currentCompany.name,
            inspections: data as IDOTInspections,
          });
    }
  }

  handleError(error: any) {
    this._snackBar
      .open(`An error occurred: ${error.message}`, 'Close')
      .afterDismissed()
      .pipe(tap(() => this.progressBarService.initializeProgressBar()))
      .subscribe();
  }

  violationsDetected = (v: number) => {
    this.extensionTabNavService.selectedTabIndex.set(1);
    this._snackBar.open(`Auto-scan competed: ${v} violations detected`, 'OK', {
      duration: 1500,
    });
  };

  handleScanComplete(scanMode: TScanMode) {
    if (scanMode === 'violations') {
      const v = this.progressBarService.violations().length;
      v > 0
        ? this.violationsDetected(v)
        : this._snackBar.open(`Auto-scan competed: no violations`, 'OK', {
            duration: 1500,
          });
      this.progressBarService.initializeProgressBar();
    } else {
      const dialogRef = this.dialog.open(ReportComponent);
      let instance = dialogRef.componentInstance;
      instance.inspections = this.progressBarService.inspections;
      dialogRef
        .afterClosed()
        .subscribe(() => this.progressBarService.initializeProgressBar());
    }
  }

  getAllViolations(range: IRange) {
    this.progressBarService.initializeState('violations');
    return this.apiService
      .getAccessibleTenants()
      .pipe(
        tap(() => {
          this.progressBarService.scanning.set(true);
        }),
        switchMap((tenants) => from(tenants))
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
                this.progressBarService.errors.push({
                  error,
                  company: this.currentCompany,
                });
              },
            }),
            catchError(() => of())
          );
        })
      );
  }

  getAllDOTInspections(range: IRange) {
    this.progressBarService.initializeState('dot');
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
              this.progressBarService.errors.push({
                error,
                company: this.currentCompany,
              });
            },
          }),
          catchError(() => of())
        );
      })
    );
  }
}
