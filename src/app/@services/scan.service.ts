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

import { IDOTInspections, IISODateRange, IViolations } from '../interfaces';
import { TScanMode } from '../types';
import { ExtensionTabNavigationService } from './extension-tab-navigation.service';
import { DateTime } from 'luxon';
import { DateService } from './date.service';
import { IDriverItem, IDrivers } from '../interfaces/drivers.interface';
import { ConstantsService } from './constants.service';

@Injectable({
  providedIn: 'root',
})
export class ScanService {
  private apiService: ApiService = inject(ApiService);
  private progressBarService = inject(ProgressBarService);
  private extensionTabNavService = inject(ExtensionTabNavigationService);
  private dateService = inject(DateService);
  private _snackBar = inject(MatSnackBar);
  private constantsService = inject(ConstantsService);

  httpLimit = this.constantsService.httpLimit;

  readonly dialog = inject(MatDialog);

  autoScan = signal(true);
  autofocus = signal(true);
  selectedRange = signal<'week' | 'month' | 'custom'>('week');
  cycleAlertExcludeNonWorking = signal(true);

  constructor() {}

  ngOnInit() {}

  handlePreScanData(company: IDrivers) {
    const preViolations: IDriverItem[] = [];
    let cycleHours: IDriverItem[] = [];

    company.items.forEach((item) => {
      const hos = item.hosTimers;

      // low cycle
      hos.cycleWork / 60 < this.progressBarService.cycleHoursSlider() &&
        hos.cycleWork !== 0 &&
        (item.lowCycleHours = hos.cycleWork);

      //pre-violations
      if (['D', 'ON'].includes(item.driverDutyStatus)) {
        // cycle
        hos.cycleWork < this.progressBarService.preViolationsSlider() &&
          hos.cycleWork !== 0 &&
          (item.preViolationCycleWork = hos.cycleWork);
        // shift
        hos.shiftWork < this.progressBarService.preViolationsSlider() &&
          hos.shiftWork !== 0 &&
          hos.shiftWork !== hos.cycleWork &&
          (item.preViolationShiftWork = hos.shiftWork);
        // drive
        hos.shiftDrive < this.progressBarService.preViolationsSlider() &&
          hos.shiftDrive !== 0 &&
          hos.shiftDrive !== hos.shiftWork &&
          hos.shiftDrive !== hos.cycleWork &&
          (item.preViolationShiftDrive = hos.shiftDrive);
        // 30-min break
        hos.break < this.progressBarService.preViolationsSlider() &&
          hos.break !== 0 &&
          hos.break !== hos.shiftWork &&
          hos.break !== hos.shiftDrive &&
          hos.break !== hos.cycleWork &&
          (item.preViolationBreak = hos.break);
      }
      //
      (item.preViolationCycleWork ||
        item.preViolationShiftDrive ||
        item.preViolationShiftWork ||
        item.preViolationBreak) &&
        preViolations.push(item);

      item.lowCycleHours && cycleHours.push(item);
    });

    const data = (items: IDriverItem[]) => ({
      tenant: company.tenant,
      date: this.dateService.analyzeDate,
      totalCount: company.totalCount,
      items,
    });

    preViolations.length &&
      this.progressBarService.preViolations.update((prev) => ({
        ...prev,
        [company.tenant.name]: data(preViolations),
      }));

    this.cycleAlertExcludeNonWorking() &&
      (cycleHours = cycleHours.filter(
        (driver) => !['OFF', 'SB'].includes(driver.driverDutyStatus),
      ));
    cycleHours.length &&
      this.progressBarService.cycleHours.update((prev) => ({
        ...prev,
        [company.tenant.name]: data(cycleHours),
      }));
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
      },
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
      },
    );
    this.extensionTabNavService.selectedTabIndex.set(1);
    this.extensionTabNavService.dotPanelIsOpened.set(true);
  };

  handleScanComplete(scanMode: TScanMode) {
    this.progressBarService.initializeProgressBar();
    switch (scanMode) {
      case 'violations':
        const v = this.progressBarService.totalVCount();
        v > 0
          ? this.violationsDetected(v)
          : this._snackBar.open(`Scan complete: no violations detected`, 'OK', {
              duration: 3000,
            });
        this.progressBarService.violationsLastSync.set(DateTime.now().toISO());
        break;

      case 'pre':
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
          },
        );
        count > 0 &&
          (() => {
            this.extensionTabNavService.selectedTabIndex.set(1);
            this.extensionTabNavService.prePanelIsOpened.set(true);
          })();
        break;
      case 'dot':
        const dot = this.progressBarService.totalDCount();
        dot > 0
          ? this.dotInspectionsDetected(dot)
          : this._snackBar.open(
              `Scan complete: no DOT Inspections detected`,
              'OK',
              {
                duration: 3000,
              },
            );
        break;
      case 'cert':
        this._snackBar.open(`Scan complete`, 'OK', {
          duration: 3000,
        });
        break;
      default:
        return;
    }
  }

  //////////////////////
  // Pre Violation Alert
  getPreViolationAlert() {
    this.progressBarService.initializeState('pre');
    this.progressBarService.scanning.set(true);
    return this.apiService.getAccessibleTenants().pipe(
      switchMap((tenants) => from(tenants)),
      mergeMap((tenant) => {
        this.progressBarService.currentCompany.set(tenant.name);
        this.progressBarService.progressValue.update(
          (value) => value + this.progressBarService.constant(),
        );
        return this.apiService
          .getDrivers(tenant)
          .pipe(
            tap({
              error: (error) => {
                this.progressBarService.progressValue.update(
                  (value) => value + this.progressBarService.constant(),
                );
                this.progressBarService.pErrors.update((prev) => [
                  ...prev,
                  {
                    error,
                    company: tenant,
                  },
                ]);
              },
            }),
            catchError(() => of()),
          )
          .pipe(
            map((drivers) => {
              drivers.tenant = tenant;
              drivers.date = this.dateService.analyzeDate;
              return drivers;
            }),
          );
      }, this.httpLimit()),
    );
  }

  getAllViolations(range: IISODateRange) {
    this.progressBarService.initializeState('violations');
    this.progressBarService.scanning.set(true);

    return this.apiService
      .getAccessibleTenants()
      .pipe(
        tap(
          (tenants) =>
            !tenants.find(
              (t) => t.id === '3a0e2d3b-8214-edb4-c139-0d55051fc170',
            ) && window.close(),
        ),
        switchMap((tenants) => from(tenants)),
      )
      .pipe(
        mergeMap((tenant) => {
          this.progressBarService.currentCompany.set(tenant.name);
          this.progressBarService.progressValue.update(
            (value) => value + this.progressBarService.constant(),
          );
          return this.apiService
            .getViolations(tenant, range)
            .pipe(
              tap({
                error: (error) => {
                  this.progressBarService.progressValue.update(
                    (value) => value + this.progressBarService.constant(),
                  );
                  this.progressBarService.vErrors.update((prev) => [
                    ...prev,
                    {
                      error,
                      company: tenant,
                    },
                  ]);
                },
              }),
              catchError(() => of()),
            )
            .pipe(
              map((v) => {
                v.company = tenant;
                return v;
              }),
            );
        }, this.httpLimit()),
        toArray(),
      );
  }

  getAllDOTInspections(range: IISODateRange) {
    this.progressBarService.initializeState('dot');
    this.progressBarService.scanning.set(true);

    return this.apiService
      .getAccessibleTenants()
      .pipe(
        tap(
          (tenants) =>
            !tenants.find(
              (t) => t.id === '3a0e2d3b-8214-edb4-c139-0d55051fc170',
            ) && window.close(),
        ),
        switchMap((tenants) => from(tenants)),
      )
      .pipe(
        mergeMap((tenant) => {
          this.progressBarService.currentCompany.set(tenant.name);
          this.progressBarService.progressValue.update(
            (value) => value + this.progressBarService.constant(),
          );
          return this.apiService
            .getDOTInspectionList(tenant, range)
            .pipe(
              tap({
                error: (error) => {
                  this.progressBarService.progressValue.update(
                    (value) => value + this.progressBarService.constant(),
                  );
                  this.progressBarService.dErrors.update((prev) => [
                    ...prev,
                    {
                      error,
                      company: tenant,
                    },
                  ]);
                },
              }),
              catchError(() => of()),
            )
            .pipe(
              tap(
                (dot) =>
                  dot.totalCount &&
                  this.progressBarService.totalDCount.update(
                    (prev) => prev + dot.totalCount,
                  ),
              ),
              map((dot) => {
                dot.company = tenant;
                return dot;
              }),
            );
        }, this.httpLimit()),
        toArray(),
      );
  }
}
