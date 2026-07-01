import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { ApiService } from './api.service';
import {
  catchError,
  concatMap,
  finalize,
  forkJoin,
  from,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  tap,
  toArray,
} from 'rxjs';
import {
  IDriver,
  IMonitorAnalysis,
  IMonitorAnalysisCategory,
  IMonitorAnalysisCertFlag,
  IMonitorAnalysisShippingFlag,
  IScanErrors,
  IScanResult,
  IScanResultDriver,
  ITenant,
} from '../interfaces';
import { NotificationService } from './notification.service';
import {
  IDailyLogs,
  IDriverDailyLogEvents,
  IEvent,
} from '../interfaces/driver-daily-log-events.interface';
import { ProgressBarService } from './progress-bar.service';
import { AppService } from './app.service';
import { ComputeEventsService } from './compute-events.service';
import { DateService } from './date.service';
import { isPcOrYm } from '../helpers/app.helpers';
import { DateTime } from 'luxon';
import { ConstantsService } from './constants.service';
import { getNoSpaceNote } from '../helpers/monitor.helpers';
import { isNoteValid } from '../helpers/advanced-scan.helpers';
import { ApiOperationsService } from './api-operations.service';
import { IDriverItem } from '../interfaces/drivers.interface';

/** A tenant plus the drivers to analyse under it. */
export interface ITenantDriverSelection {
  tenant: ITenant;
  drivers: { id: number; name: string }[];
}

/** Options + default selection for a single-tenant driver picker. */
export interface IResolvedTenantDrivers {
  options: IDriverItem[];
  defaultSelectedIds: number[];
}

/** A classified advanced-scan category: its event bucket key, the plain-text
 *  title used by the monitor analysis section, and the ProgressBar signal that
 *  backs the standalone scan-result section. */
interface ICategoryConfig {
  key: keyof IEventBuckets;
  title: string;
  signal: WritableSignal<IScanResult>;
}

/** Named event buckets produced by `classifyComputedEvents` — one array per
 *  advanced-scan category. Named (not an index signature) so both dot and
 *  keyed access type-check under `noPropertyAccessFromIndexSignature`. */
interface IEventBuckets {
  teleports: IEvent[];
  locationMismatch: IEvent[];
  eventErrors: IEvent[];
  eventWarnings: IEvent[];
  prolongedOnDuty: IEvent[];
  malfOrDataDiag: IEvent[];
  pcYm: IEvent[];
  missingEngineOn: IEvent[];
  manualDriving: IEvent[];
  highEngineHours: IEvent[];
  lowTotalEngineHours: IEvent[];
  fleetManager: IEvent[];
  refuelWarning: IEvent[];
  truckChange: IEvent[];
  eventNotes: IEvent[];
  statusOverflow: IEvent[];
  newDrivers: IEvent[];
}

@Injectable({
  providedIn: 'root',
})
export class AdvancedScanService {
  private appService = inject(AppService);
  private apiService = inject(ApiService);
  private computeEventsService = inject(ComputeEventsService);
  private progressBarService = inject(ProgressBarService);
  private dateService = inject(DateService);
  private apiOperationsService = inject(ApiOperationsService);
  private notification = inject(NotificationService);
  constantService = inject(ConstantsService);

  httpLimit = this.constantService.httpLimit;

  ptiDuration = signal(901);
  prolongedOnDutiesDuration = signal(3600); // 1h10min
  engineHoursDuration = signal(24);
  lowTotalEngineHoursCount = signal(100);
  sleeperDuration = signal(30);

  removeEngineDuringDriving = signal(false);
  analyzedCoDrivers = signal<{ [tenantId: string]: number[] }>({});
  isReadyForSmartFix = signal(false);

  constructor() {}

  deleteEngineStatusesDuringDriving(computedEvents: IEvent[], tenant: ITenant) {
    const ids: number[] = [];
    computedEvents?.forEach((e) => {
      if (e.engineInfo?.length) {
        e.engineInfo.forEach((engine) => {
          e.nextDutyStatusInfo?.totalVehicleMiles !==
            engine.totalVehicleMiles && ids.push(engine.id);
        });
      }
    });
    ids.length &&
      this.apiOperationsService.deleteEvents(tenant, ids).subscribe({});
  }

  /**
   * Re-run only the driver daily-log requests that failed (Driver Log
   * Analysis). Each failed entry carries its driver + date, so we refire just
   * that request and feed the result back through `getComputedEvents` (via
   * `dailyLogEvents$` → `handleDriverDailyLogEvents`) — no full rescan.
   */
  retryFailed() {
    const errors = this.progressBarService.aErrors();
    const driverErrors = errors.filter((e) => e.driver && e.date);
    if (!driverErrors.length) return;

    // Drop only the entries we are about to retry; keep any tenant-level errors.
    this.progressBarService.aErrors.set(
      errors.filter((e) => !(e.driver && e.date)),
    );
    this.progressBarService.scanning.set(true);

    from(driverErrors)
      .pipe(
        mergeMap(
          (e) =>
            this.dailyLogEvents$(
              e.driver as unknown as IDriver,
              e.company,
              e.date!,
            ),
          this.httpLimit(),
        ),
        finalize(() => this.progressBarService.scanning.set(false)),
      )
      .subscribe();
  }

  /**
   * Retry a single failed Driver Log Analysis request (one error row). Re-fires
   * just that driver+date through `dailyLogEvents$` (which feeds the result
   * signals via `handleDriverDailyLogEvents`), then reports a per-item
   * success/error scanbar + activity-log entry.
   */
  retryOne(err: IScanErrors) {
    if (!err.driver || !err.date) return;
    const date = err.date;
    const driverId = err.driver.id;
    const label = `${err.company.name} — ${err.driverName ?? err.driver.fullName}`;

    // Drop this specific failed entry; the retry re-adds it if it fails again.
    this.progressBarService.aErrors.set(
      this.progressBarService
        .aErrors()
        .filter((e) => !(e.driver?.id === driverId && e.date === date)),
    );
    this.progressBarService.scanning.set(true);

    this.dailyLogEvents$(err.driver as unknown as IDriver, err.company, date)
      .pipe(
        finalize(() => {
          this.progressBarService.scanning.set(false);
          const failedAgain = this.progressBarService
            .aErrors()
            .some((e) => e.driver?.id === driverId && e.date === date);
          failedAgain
            ? this.notification.error(`Retry failed: ${label}`)
            : this.notification.success(`Retried ${label}: success`);
        }),
      )
      .subscribe();
  }

  getDriversDailyLogs(date: string) {
    this.analyzedCoDrivers.set({});
    const tenants = this.appService.tenantsSignal();
    this.progressBarService.initializeState('advanced');
    this.progressBarService.scanning.set(true);

    return from(tenants).pipe(
      concatMap((tenant) => {
        this.progressBarService.currentCompany.set(tenant.name);
        const qDate = DateTime.fromISO(date).toJSDate();

        return this.apiService
          .getLogs(tenant, this.dateService.getLogsCustomDateRange(qDate))
          .pipe(
            tap({
              error: (error) => {
                this.progressBarService.progressValue.update(
                  (value) => value + this.progressBarService.constant(),
                );
                this.progressBarService.aErrors.update((prev) => [
                  ...prev,
                  {
                    error,
                    company: tenant,
                  },
                ]);
              },
            }),
            catchError(() => of()),
            tap(() =>
              this.progressBarService.progressValue.update(
                (prevValue) => prevValue + this.progressBarService.constant(),
              ),
            ),

            concatMap((log) => from(log.items)), // switchMap??
            mergeMap((driver) => {
              this.progressBarService.activeDriversCount.update((i) => i + 1);

              return this.dailyLogEvents$(
                driver,
                tenant,
                this.dateService.analyzeCustomDate(qDate),
              ).pipe(
                tap((logs) => {
                  if (
                    !logs.driverAssignedId.includes(
                      logs.vehicles[logs.vehicles.length - 1]?.name,
                    )
                  ) {
                    // driver/truck ID mismatch
                    this.progressBarService.idMismatch.update((state) => {
                      const newState = { ...state };

                      const driver = {
                        driverName: logs.driverFullName,
                        driverViewId: logs.driverAssignedId,
                        driverId: logs.driverId,
                        vehicleViewId:
                          logs.vehicles[logs.vehicles.length - 1]?.name,
                        tenant,
                      };

                      if (!newState[`${tenant.name}`])
                        newState[`${tenant.name}`] = [];

                      newState[`${tenant.name}`].push(driver);

                      return newState;
                    });
                  }

                  logs.coDrivers.length &&
                    this.analyzedCoDrivers.update((prev) => ({
                      ...prev,
                      [tenant.id]: prev[tenant.id]
                        ? [...prev[tenant.id], logs.driverId]
                        : [logs.driverId],
                    }));
                }),
              );
            }, this.httpLimit()),
            toArray(),
          );
      }),
      finalize(
        () =>
          this.removeEngineDuringDriving() && this.isReadyForSmartFix.set(true),
      ),
    );
  }

  dailyLogEvents$(driver: IDriver, tenant: ITenant, date: string) {
    return this.apiService
      .getDriverDailyLogEvents(driver.id, date, tenant.id)
      .pipe(
        tap({
          error: (error) => {
            this.progressBarService.aErrors.update((prev) => [
              ...prev,
              {
                error,
                company: tenant,
                driverName: driver.fullName,
                driver: { id: driver.id, fullName: driver.fullName },
                date,
              },
            ]);
          },
        }),
        catchError(() => of()),
        tap((driverDailyLog) => {
          if (driverDailyLog.coDrivers && driverDailyLog.coDrivers[0]?.id) {
            const coId = driverDailyLog.coDrivers[0].id;

            this.apiService
              .getDriverDailyLogEvents(coId, date, tenant.id)
              .pipe(
                tap({
                  error: (error) => {
                    this.progressBarService.aErrors.update((prev) => [
                      ...prev,
                      {
                        error,
                        company: tenant,
                        driverName: driver.fullName,
                        driver: { id: driver.id, fullName: driver.fullName },
                        date,
                      },
                    ]);
                  },
                }),
                catchError(() => of()),
              )
              .subscribe({
                next: (coDriverDailyLog) =>
                  this.handleDriverDailyLogEvents(
                    {
                      driverDailyLog,
                      coDriverDailyLog,
                    },
                    tenant,
                  ),
              });
          } else
            this.handleDriverDailyLogEvents(
              {
                driverDailyLog,
                coDriverDailyLog: null,
              },
              tenant,
            );
        }),
      );
  }

  /**
   * Config for the advanced-scan categories: each bucket key, its plain-text
   * title (used by the monitor analysis section) and the ProgressBar signal it
   * populates for the standalone scan-result sections. Single source of truth
   * shared by the scan-mode pusher and the monitor-mode assembler.
   */
  private categoryConfig(): ICategoryConfig[] {
    const p = this.progressBarService;
    return [
      { key: 'teleports', title: 'Teleports', signal: p.teleports },
      {
        key: 'locationMismatch',
        title: 'Location Mismatch',
        signal: p.locationMismatch,
      },
      { key: 'eventErrors', title: 'Event Errors', signal: p.eventErrors },
      {
        key: 'eventWarnings',
        title: 'Event Warnings',
        signal: p.eventWarnings,
      },
      {
        key: 'prolongedOnDuty',
        title: 'prolonged On Duty',
        signal: p.prolongedOnDuty,
      },
      {
        key: 'malfOrDataDiag',
        title: 'Malfunction / Data Diagnostic',
        signal: p.malfOrDataDiag,
      },
      { key: 'pcYm', title: 'PC/YM', signal: p.pcYm },
      {
        key: 'missingEngineOn',
        title: 'Missing Engine On',
        signal: p.missingEngineOn,
      },
      {
        key: 'manualDriving',
        title: 'manual Driving',
        signal: p.manualDriving,
      },
      {
        key: 'highEngineHours',
        title: 'high elapsed Engine Hours',
        signal: p.highEngineHours,
      },
      {
        key: 'lowTotalEngineHours',
        title: 'low total Engine Hours',
        signal: p.lowTotalEngineHours,
      },
      {
        key: 'fleetManager',
        title: 'Fleet manager events',
        signal: p.fleetManager,
      },
      {
        key: 'refuelWarning',
        title: 'Refuel Marker Warning',
        signal: p.refuelWarning,
      },
      { key: 'truckChange', title: 'truck change', signal: p.truckChange },
      { key: 'eventNotes', title: 'Event Notes', signal: p.eventNotes },
      {
        key: 'statusOverflow',
        title: 'Status Overflow',
        signal: p.statusOverflow,
      },
      { key: 'newDrivers', title: 'new Driver', signal: p.newDrivers },
    ];
  }

  /**
   * Pure classification of computed events into per-category buckets. Same
   * conditions used by both the single-day scan (`handleDriverDailyLogEvents`)
   * and the multi-day monitor analysis (`buildMonitorAnalysis`).
   */
  classifyComputedEvents(
    computedEvents: IEvent[],
    driverDailyLog: IDriverDailyLogEvents,
  ): IEventBuckets {
    const buckets: IEventBuckets = {
      teleports: [],
      locationMismatch: [],
      eventErrors: [],
      eventWarnings: [],
      prolongedOnDuty: [],
      malfOrDataDiag: [],
      pcYm: [],
      missingEngineOn: [],
      manualDriving: [],
      highEngineHours: [],
      lowTotalEngineHours: [],
      fleetManager: [],
      refuelWarning: [],
      truckChange: [],
      eventNotes: [],
      statusOverflow: [],
      newDrivers: [],
    };

    computedEvents.forEach((event) => {
      if (['Login', 'Logout'].includes(event.statusName)) {
        event.errorMessages.length && buckets.eventErrors.push(event);
      }

      if (event.malf) {
        buckets.malfOrDataDiag.push(event);
      }

      if (
        event.driver.id === driverDailyLog.driverId &&
        !['Login', 'Logout', 'DVIR', 'Diagnostic', 'Diag. CLR'].includes(
          event.statusName,
        )
      ) {
        if (event.eldStatusCount || event.engStatusCount)
          buckets.statusOverflow.push(event);

        if (event.isTeleport || event.dutyStatus === 'refuel') {
          buckets.teleports.push(event);
        }
        if (event.locationMismatch) {
          buckets.locationMismatch.push(event);
        }
        if (event.errorMessages?.length) {
          buckets.eventErrors.push(event);
        }
        if (event.warningMessages?.length) {
          buckets.eventWarnings.push(event);
        }
        if (event.onDutyDuration) {
          buckets.prolongedOnDuty.push(event);
        }
        if (event.manualDriving) {
          buckets.manualDriving.push(event);
        }
        if (
          event.elapsedEngineHours >= this.engineHoursDuration() &&
          event.elapsedEngineHours !== 999
        ) {
          buckets.highEngineHours.push(event);
        }
        if (event.isEventMissingPowerUp) {
          buckets.missingEngineOn.push(event);
        }
        if (
          event.engineMinutes < this.lowTotalEngineHoursCount() &&
          event.statusName !== 'Start Day'
        ) {
          buckets.lowTotalEngineHours.push(event);
        }
        if (
          event.origin ===
          'EditRequestedByAnAuthenticatedUserOtherThanTheDriver'
        ) {
          buckets.fleetManager.push(event);
        }
        if (isPcOrYm(event) || event.pcYmCLR) {
          buckets.pcYm.push(event);
        }
        if (event.isFirstEvent || buckets.newDrivers.length) {
          event.timeZone = driverDailyLog.homeTerminalTimeZone;
          buckets.newDrivers.push(event);
        }
        if (event.refuel) {
          buckets.refuelWarning.push(event);
        }
        if (event.truckChange) {
          buckets.truckChange.push(event);
        }
        if (event.notes && getNoSpaceNote(event.notes)) {
          !isNoteValid(event) && buckets.eventNotes.push(event);
        }
      }
    });

    return buckets;
  }

  /** Append a driver's classified buckets onto the standalone scan-result
   *  signals, keyed by company. */
  private pushBuckets(
    buckets: IEventBuckets,
    companyName: string,
    driverName: string,
  ) {
    this.categoryConfig().forEach(({ key, signal }) => {
      const events = buckets[key];
      if (!events?.length) return;
      signal.update((prev) => {
        const newValue = { ...prev };
        const entry: IScanResultDriver = { driverName, events };
        if (newValue[companyName]) newValue[companyName].push(entry);
        else newValue[companyName] = [entry];
        return newValue;
      });
    });
  }

  handleDriverDailyLogEvents(
    { driverDailyLog, coDriverDailyLog }: IDailyLogs,
    tenant: ITenant,
  ) {
    if (!driverDailyLog) return;
    this.progressBarService.currentDriver.set(driverDailyLog.driverFullName);

    const computedEvents = this.computeEventsService.getComputedEvents(
      {
        driverDailyLog,
        coDriverDailyLog,
      },
      tenant,
      this.ptiDuration(),
      this.prolongedOnDutiesDuration(),
      this.sleeperDuration(),
    );

    this.removeEngineDuringDriving() &&
      this.deleteEngineStatusesDuringDriving(computedEvents, tenant);

    const buckets = this.classifyComputedEvents(computedEvents, driverDailyLog);
    this.pushBuckets(
      buckets,
      driverDailyLog.companyName,
      driverDailyLog.driverFullName,
    );
  }

  /**
   * Flag shipping documents that never changed across a run of consecutive
   * (ascending) days. Empty doc sets reset the run. 3–4 unchanged days → a
   * warning; 5+ unchanged days → an error. Returns the longest qualifying run.
   */
  detectUnchangedShippingDocs(
    days: IDriverDailyLogEvents[],
  ): IMonitorAnalysisShippingFlag | null {
    const normalize = (docs: string[]) =>
      [...(docs ?? [])]
        .map((d) => (d ?? '').trim())
        .filter(Boolean)
        .sort()
        .join('|');

    const ordered = [...days].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    let best = { length: 0, docs: [] as string[] };
    let runLength = 0;
    let previousKey: string | null = null;

    for (const day of ordered) {
      const key = normalize(day.shippingDocs);
      if (!key) {
        runLength = 0;
        previousKey = null;
        continue;
      }
      if (key === previousKey) {
        runLength += 1;
      } else {
        runLength = 1;
        previousKey = key;
      }
      if (runLength > best.length) {
        best = {
          length: runLength,
          docs: (day.shippingDocs ?? []).filter(Boolean),
        };
      }
    }

    if (best.length >= 5)
      return { docs: best.docs, days: best.length, level: 'error' };
    if (best.length >= 3)
      return { docs: best.docs, days: best.length, level: 'warning' };
    return null;
  }

  /**
   * Flag uncertified log days across the analysed range using the same logic as
   * the Driver Certifications scan: drop the most recent day (today, not yet
   * certifiable), exclude non-working days, keep only uncertified ones. 1
   * uncertified day → warning; 2+ → error.
   */
  detectUncertifiedDays(
    days: IDriverDailyLogEvents[],
  ): IMonitorAnalysisCertFlag | null {
    const ordered = [...days].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const considered = ordered.slice(1); // drop most recent day
    const uncertified = considered.filter(
      (day) => !day.certified && day.minutesWorked,
    );
    if (!uncertified.length) return null;

    return {
      dates: uncertified.map((day) => day.date),
      level: uncertified.length >= 2 ? 'error' : 'warning',
    };
  }

  /**
   * Assemble a monitor-mode analysis over a date range for one driver: run the
   * faithful multi-day engine, classify the whole span into plain-text
   * categories, and layer in the shipping-docs and certification detections.
   * Returns null when no valid day logs were fetched.
   */
  buildMonitorAnalysis(
    days: IDailyLogs[],
    tenant: ITenant,
    rangeDays: number,
  ): IMonitorAnalysis | null {
    const mainLogs = days
      .map((d) => d.driverDailyLog)
      .filter((d): d is IDriverDailyLogEvents => !!d);
    if (!mainLogs.length) return null;

    const computed = this.computeEventsService.getComputedEventsMultiDay(
      days,
      tenant,
      this.ptiDuration(),
      this.prolongedOnDutiesDuration(),
      this.sleeperDuration(),
    );

    this.removeEngineDuringDriving() &&
      this.deleteEngineStatusesDuringDriving(computed, tenant);

    // All days belong to the same driver; use the most recent day as identity.
    const primary = [...mainLogs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];

    const buckets = this.classifyComputedEvents(computed, primary);
    const categories: IMonitorAnalysisCategory[] = this.categoryConfig()
      .map(({ key, title }) => ({ key, title, events: buckets[key] ?? [] }))
      .filter((category) => category.events.length);

    return {
      days: rangeDays,
      driverName: primary.driverFullName,
      driverId: primary.driverId,
      company: primary.companyName,
      tenant,
      date: primary.date,
      categories,
      unchangedShippingDocs: this.detectUnchangedShippingDocs(mainLogs),
      uncertifiedDays: this.detectUncertifiedDays(mainLogs),
    };
  }

  //////////////////////////////////////////////////////////////////////////////
  // Multi-day fetch fan-out (shared by scan mode and monitor mode)
  //////////////////////////////////////////////////////////////////////////////

  /** Enumerate the per-day analyze-dates (ascending, inclusive) for a range. */
  buildDateRange(start: Date, end: Date): string[] {
    let cursor = DateTime.fromJSDate(start).startOf('day');
    const last = DateTime.fromJSDate(end).startOf('day');
    const dates: string[] = [];
    while (cursor <= last) {
      dates.push(this.dateService.analyzeCustomDate(cursor.toJSDate()));
      cursor = cursor.plus({ days: 1 });
    }
    return dates;
  }

  /**
   * Resolve the driver picker for a single tenant: all drivers (active +
   * inactive) become the OPTIONS, and the recently-active subset from getLogs
   * (matched by numeric `id`) becomes the DEFAULT selection.
   */
  resolveTenantDrivers$(tenant: ITenant): Observable<IResolvedTenantDrivers> {
    return forkJoin({
      all: this.apiService.getAllDrivers(tenant),
      logs: this.apiService.getLogs(tenant, this.dateService.getLogsDateRange()),
    }).pipe(
      map(({ all, logs }) => {
        const options = all.items ?? [];
        const activeIds = new Set((logs.items ?? []).map((d) => d.id));
        const defaultSelectedIds = options
          .filter((o) => activeIds.has(o.id))
          .map((o) => o.id);
        return { options, defaultSelectedIds };
      }),
    );
  }

  /** Recently-active drivers for a tenant (getLogs), used for the multi-tenant
   *  scan path where there is no per-driver picker. */
  resolveActiveDrivers$(
    tenant: ITenant,
  ): Observable<{ id: number; name: string }[]> {
    return this.apiService
      .getLogs(tenant, this.dateService.getLogsDateRange())
      .pipe(
        map((log) =>
          (log.items ?? []).map((d) => ({ id: d.id, name: d.fullName })),
        ),
      );
  }

  /** Fetch one driver's daily log (+ that day's co-driver log) for a date. */
  private dayLog$(
    driverId: number,
    driverName: string,
    tenant: ITenant,
    date: string,
  ): Observable<IDailyLogs> {
    return this.apiService.getDriverDailyLogEvents(driverId, date, tenant.id).pipe(
      catchError((error) => {
        this.progressBarService.aErrors.update((prev) => [
          ...prev,
          {
            error,
            company: tenant,
            driverName,
            driver: { id: driverId, fullName: driverName },
            date,
          },
        ]);
        return of(null);
      }),
      switchMap((main) => {
        if (!main)
          return of({
            driverDailyLog: null,
            coDriverDailyLog: null,
          } as IDailyLogs);
        const coId = main.coDrivers?.[0]?.id;
        if (!coId)
          return of({
            driverDailyLog: main,
            coDriverDailyLog: null,
          } as IDailyLogs);
        return this.apiService.getDriverDailyLogEvents(coId, date, tenant.id).pipe(
          catchError(() => of(null)),
          map(
            (co) =>
              ({
                driverDailyLog: main,
                coDriverDailyLog: co,
              }) as IDailyLogs,
          ),
        );
      }),
    );
  }

  /** Fetch every day (+ co-driver) for one driver over a list of dates. */
  fetchDriverDays$(
    driverId: number,
    driverName: string,
    tenant: ITenant,
    dates: string[],
  ): Observable<IDailyLogs[]> {
    return from(dates).pipe(
      mergeMap(
        (date) => this.dayLog$(driverId, driverName, tenant, date),
        this.httpLimit(),
      ),
      toArray(),
    );
  }

  /** One driver's multi-day scan: fetch → compute span → classify → push to the
   *  standalone category signals. Advances the progress bar by `step`. */
  private analyzeScanDriver$(
    driverId: number,
    driverName: string,
    tenant: ITenant,
    dates: string[],
    step: number,
  ): Observable<IDailyLogs[]> {
    this.progressBarService.currentDriver.set(driverName);
    return this.fetchDriverDays$(driverId, driverName, tenant, dates).pipe(
      tap((days) => {
        this.progressBarService.activeDriversCount.update((i) => i + 1);

        const mainLogs = days
          .map((d) => d.driverDailyLog)
          .filter((d): d is IDriverDailyLogEvents => !!d);

        if (mainLogs.length) {
          const computed = this.computeEventsService.getComputedEventsMultiDay(
            days,
            tenant,
            this.ptiDuration(),
            this.prolongedOnDutiesDuration(),
            this.sleeperDuration(),
          );
          this.removeEngineDuringDriving() &&
            this.deleteEngineStatusesDuringDriving(computed, tenant);

          const primary = [...mainLogs].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          )[0];
          const buckets = this.classifyComputedEvents(computed, primary);
          this.pushBuckets(
            buckets,
            primary.companyName,
            primary.driverFullName,
          );

          days.some((d) => d.coDriverDailyLog) &&
            this.analyzedCoDrivers.update((prev) => ({
              ...prev,
              [tenant.id]: prev[tenant.id]
                ? [...prev[tenant.id], primary.driverId]
                : [primary.driverId],
            }));
        }

        this.progressBarService.progressValue.update((v) => v + step);
      }),
    );
  }

  /** Scan-mode Driver Log Analysis over a date range for the resolved
   *  tenant/driver selection. Populates the standalone category signals. */
  runScanAnalysis$(
    selections: ITenantDriverSelection[],
    dates: string[],
  ): Observable<unknown> {
    this.progressBarService.initializeState('advanced');
    this.progressBarService.scanning.set(true);
    this.analyzedCoDrivers.set({});

    const totalDrivers =
      selections.reduce((sum, sel) => sum + sel.drivers.length, 0) || 1;
    const step = 100 / totalDrivers;

    return from(selections).pipe(
      concatMap((sel) => {
        this.progressBarService.currentCompany.set(sel.tenant.name);
        return from(sel.drivers).pipe(
          mergeMap(
            (d) =>
              this.analyzeScanDriver$(d.id, d.name, sel.tenant, dates, step),
            this.httpLimit(),
          ),
          toArray(),
        );
      }),
      finalize(
        () =>
          this.removeEngineDuringDriving() &&
          this.isReadyForSmartFix.set(true),
      ),
    );
  }

  /** Delete engine events that occurred during driving across a driver's range
   *  (monitor pipeline phase 1). Fetches the span, computes it and removes the
   *  offending engine ids; completes once the delete request settles. */
  removeEnginesOverRange$(
    driverId: number,
    driverName: string,
    tenant: ITenant,
    dates: string[],
  ): Observable<unknown> {
    return this.fetchDriverDays$(driverId, driverName, tenant, dates).pipe(
      switchMap((days) => {
        const computed = this.computeEventsService.getComputedEventsMultiDay(
          days,
          tenant,
          this.ptiDuration(),
          this.prolongedOnDutiesDuration(),
          this.sleeperDuration(),
        );
        const ids: number[] = [];
        computed.forEach((e) => {
          if (e.engineInfo?.length) {
            e.engineInfo.forEach((engine) => {
              e.nextDutyStatusInfo?.totalVehicleMiles !==
                engine.totalVehicleMiles && ids.push(engine.id);
            });
          }
        });
        if (!ids.length) return of(null);
        return this.apiOperationsService.deleteEvents(tenant, ids);
      }),
    );
  }

  /** Monitor-mode Driver Log Analysis: fetch one driver's range and replace the
   *  single `[N day(s) analysis]` section. */
  runMonitorAnalysis$(
    driverId: number,
    driverName: string,
    tenant: ITenant,
    dates: string[],
  ): Observable<IDailyLogs[]> {
    this.progressBarService.initializeProgressBar();
    this.progressBarService.monitorAnalysis.set(null);
    this.progressBarService.aErrors.set([]);
    this.progressBarService.progressMode.set('indeterminate');
    this.progressBarService.scanning.set(true);
    this.progressBarService.currentCompany.set(tenant.name);
    this.progressBarService.currentDriver.set(driverName);

    return this.fetchDriverDays$(driverId, driverName, tenant, dates).pipe(
      tap((days) => {
        const analysis = this.buildMonitorAnalysis(days, tenant, dates.length);
        analysis && this.progressBarService.monitorAnalysis.set(analysis);
        this.progressBarService.progressValue.set(100);
      }),
    );
  }
}
