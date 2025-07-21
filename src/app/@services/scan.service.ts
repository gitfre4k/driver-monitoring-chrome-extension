import { inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  concatMap,
  from,
  map,
  mergeMap,
  of,
  switchMap,
  tap,
  toArray,
} from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { ApiService } from './api.service';
import { ProgressBarService } from './progress-bar.service';
import { ReportComponent } from '../components/report/report.component';

import { IDOTInspections, IRange, IViolations } from '../interfaces';
import { TScanMode } from '../types';
import { ExtensionTabNavigationService } from './extension-tab-navigation.service';
import { DateTime } from 'luxon';
import { PanelService } from './panel.service';

@Injectable({
  providedIn: 'root',
})
export class ScanService {
  private apiService: ApiService = inject(ApiService);
  private progressBarService = inject(ProgressBarService);
  private extensionTabNavService = inject(ExtensionTabNavigationService);
  private _snackBar = inject(MatSnackBar);
  private panelService = inject(PanelService);

  readonly dialog = inject(MatDialog);

  autoScan = signal(true);
  selectedRange = signal<'week' | 'month' | 'custom'>('week');

  constructor() {}

  ngOnInit() {}

  handleScanData(data: IViolations[] | IDOTInspections[], scanMode: TScanMode) {
    data.forEach((result) => {
      if (result.totalCount > 0) {
        scanMode === 'violations'
          ? this.progressBarService.violations.update((v) => [
              ...v,
              {
                violations: result as IViolations,
              },
            ])
          : this.progressBarService.inspections.update((d) => [
              ...d,
              {
                inspections: result as any,
              },
            ]);
      }
    });
  }

  handleError(error: any) {
    this._snackBar
      .open(`An error occurred: ${error.message}`, 'Close')
      .afterDismissed()
      .pipe(tap(() => this.progressBarService.initializeProgressBar()))
      .subscribe();
  }

  violationsDetected = (v: number) => {
    this._snackBar.open(
      `Scan compete: ${v} violation${v > 1 ? 's' : ''} detected`,
      'OK',
      {
        duration: 3000,
      }
    );
    // this.extensionTabNavService.selectedTabIndex.set(1);
    // this.panelService.violationPanelIsOpened.set(true);
  };

  dotInspectionsDetected = (d: number) => {
    this._snackBar.open(
      `Scan compete: ${d} DOT Inspection${d > 1 ? 's' : ''} detected`,
      'OK',
      {
        duration: 3000,
      }
    );
    this.extensionTabNavService.selectedTabIndex.set(1);
    this.panelService.dotPanelIsOpened.set(true);
  };

  handleScanComplete(scanMode: TScanMode) {
    if (scanMode === 'violations') {
      const v = this.progressBarService.totalVCount();
      v > 0
        ? this.violationsDetected(v)
        : this._snackBar.open(`Scan complete: no violations detected`, 'OK', {
            duration: 3000,
          });
      this.progressBarService.violationsLastSync.set(DateTime.now().toISO());
      this.progressBarService.initializeProgressBar();
    } else {
      const dot = this.progressBarService.totalDCount();
      dot > 0
        ? this.dotInspectionsDetected(dot)
        : this._snackBar.open(
            `Scan complete: no DOT Inspections detected`,
            'OK',
            {
              duration: 3000,
            }
          );
      this.progressBarService.violationsLastSync.set(DateTime.now().toISO());
      this.progressBarService.initializeProgressBar();
    }
  }

  getAllViolations(range: IRange) {
    this.progressBarService.initializeState('violations');
    this.progressBarService.scanning.set(true);

    return this.apiService
      .getAccessibleTenants()
      .pipe(
        tap(
          (tenants) =>
            !tenants.find(
              (t) => t.id === '3a0e2d3b-8214-edb4-c139-0d55051fc170'
            ) && window.close()
        ),
        switchMap((tenants) => from(tenants))
      )
      .pipe(
        mergeMap((tenant) => {
          this.progressBarService.currentCompany.set(tenant.name);
          this.progressBarService.progressValue.update(
            (value) => value + this.progressBarService.constant()
          );
          return this.apiService
            .getViolations(tenant, range)
            .pipe(
              tap({
                error: (error) => {
                  this.progressBarService.progressValue.update(
                    (value) => value + this.progressBarService.constant()
                  );
                  this.progressBarService.errors.push({
                    error,
                    company: tenant,
                  });
                },
              }),
              catchError(() => of())
            )
            .pipe(
              tap(
                (v) =>
                  v.totalCount &&
                  this.progressBarService.totalVCount.update(
                    (prev) => prev + v.totalCount
                  )
              ),
              map((v) => {
                v.company = tenant;
                return v;
              })
            );
        }, 10),
        toArray()
      );
  }

  getAllDOTInspections(range: IRange) {
    this.progressBarService.initializeState('dot');
    this.progressBarService.scanning.set(true);

    return this.apiService
      .getAccessibleTenants()
      .pipe(
        tap(
          (tenants) =>
            !tenants.find(
              (t) => t.id === '3a0e2d3b-8214-edb4-c139-0d55051fc170'
            ) && window.close()
        ),
        switchMap((tenants) => from(tenants))
      )
      .pipe(
        mergeMap((tenant) => {
          this.progressBarService.currentCompany.set(tenant.name);
          this.progressBarService.progressValue.update(
            (value) => value + this.progressBarService.constant()
          );
          return this.apiService
            .getDOTInspectionList(tenant, range)
            .pipe(
              tap({
                error: (error) => {
                  this.progressBarService.progressValue.update(
                    (value) => value + this.progressBarService.constant()
                  );
                  this.progressBarService.errors.push({
                    error,
                    company: tenant,
                  });
                },
              }),
              catchError(() => of())
            )
            .pipe(
              tap(
                (dot) =>
                  dot.totalCount &&
                  this.progressBarService.totalDCount.update(
                    (prev) => prev + dot.totalCount
                  )
              ),
              map((dot) => {
                dot.company = tenant;
                return dot;
              })
            );
        }, 10),
        toArray()
      );
  }
}
