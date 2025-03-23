import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import {
  catchError,
  concatMap,
  from,
  mergeMap,
  of,
  Subscription,
  tap,
} from 'rxjs';
import {
  ICompany,
  IDOTInspections,
  IProgressBar,
  IScanDOTInspections,
  IScanErrors,
  IScanViolations,
  IViolations,
} from '../interfaces';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ReportComponent } from '../components/report/report.component';

@Injectable({
  providedIn: 'root',
})
export class ScanService {
  private apiService: ApiService = inject(ApiService);
  private _snackBar = inject(MatSnackBar);

  readonly dialog = inject(MatDialog);

  scanning = signal(false);

  violations: IScanViolations[] = [];
  inspections: IScanDOTInspections[] = [];

  currentCompany: ICompany = { id: '', name: '' };
  errors: IScanErrors[] = [];

  progressBar: IProgressBar = {
    mode: 'determinate',
    value: 0,
    bufferValue: 0,
    constant: 0,
    currentCompany: '',
    totalCount: 0,
  };

  constructor() {}

  ngOnInit() {}

  initializeScanState() {
    this.scanning.set(false);
    this.violations = [];
    this.inspections = [];
    this.currentCompany = { id: '', name: '' };
    this.errors = [];
    this.progressBar = {
      mode: 'determinate',
      value: 0,
      bufferValue: 0,
      constant: 0,
      currentCompany: '',
      totalCount: 0,
    };
  }

  handleViolations(violations: IViolations) {
    this.progressBar.value += this.progressBar.constant;
    if (violations.totalCount > 0) {
      this.progressBar.totalCount += violations.totalCount;
      this.violations.push({
        company: this.currentCompany.name,
        violations,
      });
    }
  }

  handleDOTInspections(inspections: IDOTInspections) {
    this.progressBar.value += this.progressBar.constant;
    if (inspections.totalCount > 0) {
      this.progressBar.totalCount += inspections.totalCount;
      this.inspections.push({
        company: this.currentCompany.name,
        inspections,
      });
    }
  }

  handleError(error: any) {
    this._snackBar
      .open(`An error occurred: ${error.message}`, 'Close')
      .afterDismissed()
      .pipe(tap(() => this.initializeScanState()))
      .subscribe();
  }

  handleViolationsComplete() {
    const dialogRef = this.dialog.open(ReportComponent);
    let instance = dialogRef.componentInstance;
    instance.violations = this.violations;
    dialogRef.afterClosed().subscribe(() => this.initializeScanState());
  }

  handleDOTComplete() {
    const dialogRef = this.dialog.open(ReportComponent);
    let instance = dialogRef.componentInstance;
    instance.inspections = this.inspections;
    dialogRef.afterClosed().subscribe(() => this.initializeScanState());
  }

  getAllViolations() {
    return this.apiService
      .getAccessibleTenants()
      .pipe(
        tap((tenants) => {
          this.scanning.set(true);
          this.progressBar.constant = 100 / tenants.length;
          this.progressBar.value = this.progressBar.constant;
          this.progressBar.mode = 'determinate';
        }),
        mergeMap((tenants) => from(tenants))
      )
      .pipe(
        concatMap((tenant) => {
          this.currentCompany = tenant;
          this.progressBar.currentCompany = this.currentCompany.name;
          return this.apiService.getViolations(tenant).pipe(
            tap({
              error: (error) => {
                this.progressBar.value =
                  this.progressBar.value + this.progressBar.constant;
                this.errors.push({ error, company: this.currentCompany });
              },
            }),
            catchError(() => of())
          );
        })
      );
  }

  getAllDotInspections() {
    return this.apiService.getAccessibleTenants().pipe(
      tap((tenants) => {
        this.scanning.set(true);
        this.progressBar.constant = 100 / tenants.length;
        this.progressBar.value = this.progressBar.constant;
        this.progressBar.mode = 'determinate';
      }),
      mergeMap((tenants) => from(tenants)),
      concatMap((tenant) => {
        this.currentCompany = tenant;
        this.progressBar.currentCompany = this.currentCompany.name;

        return this.apiService.getDOTInspectionList(tenant).pipe(
          tap({
            error: (error) => {
              this.progressBar.value =
                this.progressBar.value + this.progressBar.constant;
              this.errors.push({ error, company: this.currentCompany });
            },
          }),
          catchError(() => of())
        );
      })
    );
  }
}
