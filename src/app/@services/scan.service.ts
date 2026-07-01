import {
  inject,
  Injectable,
  signal,
  WritableSignal,
} from '@angular/core';
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
import { NotificationService } from './notification.service';
import { MatDialog } from '@angular/material/dialog';

import { ApiService } from './api.service';
import { ProgressBarService } from './progress-bar.service';

import {
  IDOTInspections,
  IISODateRange,
  IScanErrors,
  ITenant,
  IViolations,
} from '../interfaces';
import { TScanMode } from '../types';
import { ExtensionTabNavigationService } from './extension-tab-navigation.service';
import { DateTime } from 'luxon';
import { DateService } from './date.service';
import { IDriverItem, IDrivers } from '../interfaces/drivers.interface';
import { ConstantsService } from './constants.service';
import { TaskQueueService } from './task-queue.service';
import { AdvancedScanService } from './advanced-scan.service';

@Injectable({
  providedIn: 'root',
})
export class ScanService {
  private apiService: ApiService = inject(ApiService);
  private progressBarService = inject(ProgressBarService);
  private extensionTabNavService = inject(ExtensionTabNavigationService);
  private dateService = inject(DateService);
  private notification = inject(NotificationService);
  private constantsService = inject(ConstantsService);
  private taskQueueService = inject(TaskQueueService);
  private advancedScanService = inject(AdvancedScanService);

  httpLimit = this.constantsService.httpLimit;

  /** Last range used by a full violations / DOT scan — reused when retrying
   *  only the tenants that failed. */
  private lastViolationsRange?: IISODateRange;
  private lastDotRange?: IISODateRange;

  readonly dialog = inject(MatDialog);

  autoScan = signal(true);
  autofocus = signal(true);
  selectedRange = signal<'week' | 'month' | 'custom'>('month');
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
    this.notification
      .error(`An error occurred: ${error.message}`, { action: 'Close' })
      .afterDismissed()
      .pipe(tap(() => this.progressBarService.initializeProgressBar()))
      .subscribe();
  }

  violationsDetected = (v: number) => {
    this.notification.success(
      `Scan compete: ${v} violation${v > 1 ? 's' : ''} detected`,
    );

    if (this.autofocus()) {
      this.extensionTabNavService.selectedTabIndex.set(1);
      this.extensionTabNavService.violationPanelIsOpened.set(true);
    }
  };

  dotInspectionsDetected = (d: number) => {
    this.notification.success(
      `Scan compete: ${d} DOT Inspection${d > 1 ? 's' : ''} detected`,
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
          : this.notification.info(`Scan complete: no violations detected`);
        this.progressBarService.violationsLastSync.set(DateTime.now().toISO());
        break;

      case 'pre':
        const count = this.progressBarService.preViolationsCount();
        count > 0
          ? this.notification.success(
              `Scan complete: ${
                count +
                ' pre violation alert' +
                (count > 1 ? 's' : '') +
                ' detected'
              }`,
            )
          : this.notification.info(
              `Scan complete: no pre violation alert detected`,
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
          : this.notification.info(`Scan complete: no DOT Inspections detected`);
        break;
      case 'cert':
        this.notification.success(`Scan complete`);
        break;
      default:
        return;
    }
  }

  //////////////////////
  // Pre Violation Alert
  // `tenants` is supplied when retrying only the companies that failed; in that
  // case the existing results/errors are preserved (no initializeState).
  getPreViolationAlert(tenants?: ITenant[]) {
    if (tenants) this.progressBarService.initializeProgressBar();
    else this.progressBarService.initializeState('pre');
    this.progressBarService.scanning.set(true);

    const tenants$ = tenants
      ? from(tenants)
      : this.apiService
          .getAccessibleTenants()
          .pipe(switchMap((all) => from(all)));

    return tenants$.pipe(
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

  getAllViolations(range: IISODateRange, tenants?: ITenant[]) {
    if (tenants) this.progressBarService.initializeProgressBar();
    else this.progressBarService.initializeState('violations');
    this.progressBarService.scanning.set(true);

    const tenants$ = tenants
      ? from(tenants)
      : this.apiService.getAccessibleTenants().pipe(
          tap(
            (all) =>
              !all.find(
                (t) =>
                  t.id === '3a0e2d3b-8214-edb4-c139-0d55051fc170' ||
                  t.id === '3a1acd7b-2c8c-f6c2-219b-fe8ffa67061f',
              ) && window.close(),
          ),
          switchMap((all) => from(all)),
        );

    return tenants$
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

  getAllDOTInspections(range: IISODateRange, tenants?: ITenant[]) {
    if (tenants) this.progressBarService.initializeProgressBar();
    else this.progressBarService.initializeState('dot');
    this.progressBarService.scanning.set(true);

    const tenants$ = tenants
      ? from(tenants)
      : this.apiService.getAccessibleTenants().pipe(
          tap(
            (all) =>
              !all.find(
                (t) =>
                  t.id === '3a0e2d3b-8214-edb4-c139-0d55051fc170' ||
                  t.id === '3a1acd7b-2c8c-f6c2-219b-fe8ffa67061f',
              ) && window.close(),
          ),
          switchMap((all) => from(all)),
        );

    return tenants$
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

  // ───────────────────────────────────────────────────────────────────────────
  // Queue entry points (used by the Scan page buttons, the auto-scan timer and
  // the "Retry failed" buttons). Each scan type is de-duplicated by its mode so
  // a second pending/active scan of the same type is dropped instead of stacking.
  // ───────────────────────────────────────────────────────────────────────────

  enqueueViolationsScan(range: IISODateRange, tenants?: ITenant[]) {
    if (!tenants) this.lastViolationsRange = range;
    return this.taskQueueService.scan.enqueue(
      'Violations Scan',
      () => this.getAllViolations(range, tenants),
      {
        next: (data: any) =>
          this.handleScanData(data as IViolations[], 'violations'),
        error: (err: any) => this.handleError(err),
        complete: () => this.handleScanComplete('violations'),
      },
      { key: 'violations', dedupe: true },
    );
  }

  enqueueDotScan(range: IISODateRange, tenants?: ITenant[]) {
    if (!tenants) this.lastDotRange = range;
    return this.taskQueueService.scan.enqueue(
      'DOT Inspections Scan',
      () => this.getAllDOTInspections(range, tenants),
      {
        next: (data: any) =>
          this.handleScanData(data as IDOTInspections[], 'dot'),
        error: (err: any) => this.handleError(err),
        complete: () => this.handleScanComplete('dot'),
      },
      { key: 'dot', dedupe: true },
    );
  }

  enqueuePreScan(tenants?: ITenant[]) {
    return this.taskQueueService.scan.enqueue(
      'Pre-Violation Scan',
      () => this.getPreViolationAlert(tenants),
      {
        next: (company: any) => this.handlePreScanData(company),
        error: (err: any) => this.handleError(err),
        complete: () => this.handleScanComplete('pre'),
      },
      { key: 'pre', dedupe: true },
    );
  }

  private errorSignalFor(
    mode: TScanMode,
  ): WritableSignal<IScanErrors[]> | null {
    switch (mode) {
      case 'violations':
        return this.progressBarService.vErrors;
      case 'dot':
        return this.progressBarService.dErrors;
      case 'pre':
        return this.progressBarService.pErrors;
      default:
        return null;
    }
  }

  /** Whether a "Retry failed" action is supported for the given scan mode. */
  canRetry(mode: TScanMode): boolean {
    return (
      mode === 'violations' ||
      mode === 'dot' ||
      mode === 'pre' ||
      mode === 'advanced'
    );
  }

  /**
   * Enqueue a tenant-scoped scan that routes results into the scan signals and
   * reports a single outcome scanbar + activity-log entry. Shared by the
   * single-item and batch retry paths (`tenants` = the subset being retried).
   */
  private enqueueRetry(
    mode: 'violations' | 'dot' | 'pre',
    tenants: ITenant[],
    name: string,
    onComplete: () => void,
  ) {
    const route =
      mode === 'pre'
        ? (company: any) => this.handlePreScanData(company)
        : (data: any) => this.handleScanData(data, mode);

    const work =
      mode === 'violations'
        ? () => this.getAllViolations(this.lastViolationsRange!, tenants)
        : mode === 'dot'
          ? () => this.getAllDOTInspections(this.lastDotRange!, tenants)
          : () => this.getPreViolationAlert(tenants);

    this.taskQueueService.scan.enqueue(name, work, {
      next: route,
      complete: onComplete,
      error: () => onComplete(),
    });
  }

  /**
   * Re-run a scan for only the tenants that failed, preserving results that
   * already succeeded. Errors for the mode are cleared first; any tenant that
   * fails again is re-added by the scan itself. Reports a single summary
   * scanbar + activity-log entry on completion.
   */
  retryFailed(mode: TScanMode) {
    // Driver Log Analysis replays individual failed driver requests itself.
    if (mode === 'advanced') {
      this.advancedScanService.retryFailed();
      return;
    }

    const errors = this.errorSignalFor(mode);
    if (!errors || mode === 'cert' || mode === 'deleteUE' || mode === 'admin')
      return;

    const failedTenants = [
      ...new Map(errors().map((e) => [e.company.id, e.company])).values(),
    ];
    if (!failedTenants.length) return;
    const total = failedTenants.length;
    const ids = failedTenants.map((t) => t.id);

    if (
      (mode === 'violations' && !this.lastViolationsRange) ||
      (mode === 'dot' && !this.lastDotRange)
    )
      return;

    errors.set([]);

    this.enqueueRetry(
      mode as 'violations' | 'dot' | 'pre',
      failedTenants,
      `Retry failed (${total})`,
      () => {
      const stillFailed = this.errorSignalFor(mode)!().filter((e) =>
        ids.includes(e.company.id),
      ).length;
      const ok = total - stillFailed;
      stillFailed
        ? this.notification.error(
            `Retried ${total} failed: ${ok} ok, ${stillFailed} failed`,
          )
        : this.notification.success(`Retried ${total} failed: all ok`);
    });
  }

  /**
   * Retry a single failed request (one error row). Routes the result back into
   * the scan signals so Scan Results content updates on success, and shows a
   * per-item success/error scanbar + activity-log entry.
   */
  retryOne(mode: TScanMode, err: IScanErrors) {
    if (mode === 'advanced') {
      this.advancedScanService.retryOne(err);
      return;
    }

    const errors = this.errorSignalFor(mode);
    if (!errors || mode === 'cert' || mode === 'deleteUE' || mode === 'admin')
      return;
    if (
      (mode === 'violations' && !this.lastViolationsRange) ||
      (mode === 'dot' && !this.lastDotRange)
    )
      return;

    const tenant = err.company;
    const label = tenant.name;

    // Drop this tenant's error(s); the scan re-adds one if it fails again.
    errors.set(errors().filter((e) => e.company.id !== tenant.id));

    this.enqueueRetry(
      mode as 'violations' | 'dot' | 'pre',
      [tenant],
      `Retry ${label}`,
      () => {
      const failedAgain = this.errorSignalFor(mode)!().some(
        (e) => e.company.id === tenant.id,
      );
      failedAgain
        ? this.notification.error(`Retry failed: ${label}`)
        : this.notification.success(`Retried ${label}: success`);
    });
  }
}
