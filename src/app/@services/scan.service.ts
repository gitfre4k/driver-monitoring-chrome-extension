import { inject, Injectable, signal } from '@angular/core';
import {
  catchError,
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

import { IDOTInspections, IRange, IViolations } from '../interfaces';
import { TScanMode } from '../types';
import { ExtensionTabNavigationService } from './extension-tab-navigation.service';
import { DateTime } from 'luxon';
import { DateService } from './date.service';
import { IDriverItem, IDrivers } from '../interfaces/drivers.interface';

@Injectable({
  providedIn: 'root',
})
export class ScanService {
  private apiService: ApiService = inject(ApiService);
  private progressBarService = inject(ProgressBarService);
  private extensionTabNavService = inject(ExtensionTabNavigationService);
  private dateService = inject(DateService);
  private _snackBar = inject(MatSnackBar);

  readonly dialog = inject(MatDialog);

  autoScan = signal(true);
  autofocus = signal(true);
  selectedRange = signal<'week' | 'month' | 'custom'>('week');

  constructor() {}

  ngOnInit() {}

  handlePreScanData(company: IDrivers[]) {
    company.forEach((driver) => {
      const items: IDriverItem[] = [];
      driver.items.forEach((item) => {
        const hos = item.hosTimers;
        if (['D', 'ON'].includes(item.driverDutyStatus)) {
          hos.shiftWork < this.progressBarService.preViolationsSlider() &&
            hos.shiftWork !== 0 &&
            (item.preViolationShiftWork = hos.shiftWork);
          hos.shiftDrive < this.progressBarService.preViolationsSlider() &&
            hos.shiftDrive !== 0 &&
            hos.shiftDrive !== hos.shiftWork &&
            (item.preViolationShiftDrive = hos.shiftDrive);
          hos.break < this.progressBarService.preViolationsSlider() &&
            hos.break !== 0 &&
            hos.break !== hos.shiftWork &&
            hos.break !== hos.shiftDrive &&
            (item.preViolationBreak = hos.break);
          (item.preViolationShiftDrive ||
            item.preViolationShiftWork ||
            item.preViolationBreak) &&
            items.push(item);
        }
      });
      const data: IDrivers = {
        tenant: driver.tenant,
        date: DateTime.fromJSDate(this.dateService.today).toUTC().toISO()!,
        totalCount: driver.totalCount,
        items,
      };
      items.length &&
        this.progressBarService.preViolations.update((prev) => {
          const newValue = { ...prev, [driver.tenant.name]: data };
          ///////////
          return newValue;
        });
    });
  }

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

    if (this.autofocus()) {
      this.extensionTabNavService.selectedTabIndex.set(1);
      this.extensionTabNavService.violationPanelIsOpened.set(true);
    }
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
    this.extensionTabNavService.dotPanelIsOpened.set(true);
  };

  handleScanComplete(scanMode: TScanMode) {
    switch (scanMode) {
      case 'violations':
        {
          const v = this.progressBarService.totalVCount();
          v > 0
            ? this.violationsDetected(v)
            : this._snackBar.open(
                `Scan complete: no violations detected`,
                'OK',
                {
                  duration: 3000,
                }
              );
          this.progressBarService.violationsLastSync.set(
            DateTime.now().toISO()
          );
        }
        break;
      case 'pre':
        {
          const count = this.progressBarService.preViolationsCount();
          this._snackBar.open(
            `Scan complete: ${
              count > 0
                ? count +
                  ' pre violation alert' +
                  (count > 1 ? 's' : '') +
                  ' detected'
                : 'no pre violation alert detected'
            }`,
            'OK',
            {
              duration: 3000,
            }
          );
          count > 0 &&
            (() => {
              this.extensionTabNavService.selectedTabIndex.set(1);
              this.extensionTabNavService.prePanelIsOpened.set(true);
            })();
        }
        break;
      case 'dot':
        {
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
        }
        break;
      default:
        return;
    }
    this.progressBarService.initializeProgressBar();
  }

  //////////////////////
  // Pre Violation Alert
  getPreViolationAlert() {
    this.progressBarService.initializeState('pre');
    this.progressBarService.scanning.set(true);
    return this.apiService
      .getAccessibleTenants()
      .pipe(switchMap((tenants) => from(tenants)))
      .pipe(
        mergeMap((tenant) => {
          this.progressBarService.currentCompany.set(tenant.name);
          this.progressBarService.progressValue.update(
            (value) => value + this.progressBarService.constant()
          );
          return this.apiService.getDrivers(tenant).pipe(
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
            map((drivers) => {
              drivers.tenant = tenant;
              drivers.date = DateTime.fromJSDate(this.dateService.today)
                .toUTC()
                .toISO()!;

              return drivers;
            })
          );
        }, 10),
        toArray()
      );
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
