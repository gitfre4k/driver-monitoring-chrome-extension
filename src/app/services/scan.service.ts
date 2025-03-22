import { inject, Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { catchError, concatMap, from, mergeMap, of, tap } from 'rxjs';
import { ICompany, IProgressBar, IViolations } from '../interfaces';
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

  currentCompany: ICompany = { id: '', name: '' };
  scanning = false;
  violations: { company: string; violations: IViolations }[] = [];
  errors: { error: { name: string; message: string }; company: ICompany }[] =
    [];

  progressBar: IProgressBar = {
    mode: 'determinate',
    value: 0,
    bufferValue: 0,
    constant: 0,
    currentCompany: '',
    totalCount: 0,
  };

  handleViolations(violations: IViolations) {
    this.progressBar.value = this.progressBar.value + this.progressBar.constant;
    if (violations.totalCount > 0) {
      this.progressBar.totalCount =
        this.progressBar.totalCount + violations.totalCount;
      this.violations.push({
        company: this.currentCompany.name,
        violations,
      });
    }
  }

  handleError(error: any) {
    this._snackBar
      .open(`An error occurred: ${error.message}`, 'Close')
      .afterDismissed()
      .pipe(
        tap(() => {
          this.progressBar.value = 0;
          this.scanning = false;
        })
      )
      .subscribe();
  }

  handleComplete() {
    this.progressBar.value = 100;
    console.log('Completed processing violations.');
    console.log(this.violations);
    this.scanning = false;
    this.openDialog();
    this.progressBar.value = 0;
  }

  openDialog() {
    const dialogRef = this.dialog.open(ReportComponent);
    let instance = dialogRef.componentInstance;
    instance.violations = this.violations;
    dialogRef.afterClosed().subscribe(() => this.stopGetAllViolations());
  }

  stopGetAllViolations = () => {
    this.scanning = false;
    this.progressBar.totalCount = 0;
  };

  getAllViolations() {
    return this.apiService
      .getAccessibleTenants()
      .pipe(
        tap((tenants) => {
          this.scanning = true;
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
}
