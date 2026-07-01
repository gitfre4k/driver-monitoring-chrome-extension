import { computed, inject, Injectable, signal, effect } from '@angular/core';
import { MonitorService } from './monitor.service';

import { dutyStatusNames, getDuration, getTime } from '../helpers/zip.helpers';
import { ApiOperationsService } from './api-operations.service';
import {
  catchError,
  defer,
  EMPTY,
  forkJoin,
  map,
  mergeMap,
  Observable,
  of,
  Subject,
  switchMap,
  takeUntil,
  toArray,
  tap,
} from 'rxjs';
import { ITenant } from '../interfaces';
import { ApiService } from './api.service';
import { UrlService } from './url.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ZipDialogComponent } from '../components/UI/zip-dialog/zip-dialog.component';
import { DialogConfirmComponent } from '../components/UI/dialog-confirm/dialog-confirm.component';
import { NotificationService } from './notification.service';

import { ComputeEventsService } from './compute-events.service';
import { ZipInitializationService } from './zip-initialization.service';
import { ZipResizeService } from './zip-resize.service';
import { ZipShiftService } from './zip-shift.service';
import { IZipInitializationData } from '../interfaces/zip.interface';
import { SmartFixService } from './smart-fix.service';
import { TaskQueueService } from './task-queue.service';
import {
  IDriverDailyLogEvents,
  IEvent,
} from '../interfaces/driver-daily-log-events.interface';

@Injectable({
  providedIn: 'root',
})
export class ZipService {
  monitorService = inject(MonitorService);
  smartFixService = inject(SmartFixService);
  apiService = inject(ApiService);
  apiOperationsService = inject(ApiOperationsService);
  urlService = inject(UrlService);
  computeEventsService = inject(ComputeEventsService);
  taskQueueService = inject(TaskQueueService);

  zipInitializationService = inject(ZipInitializationService);
  zipResizeService = inject(ZipResizeService);
  zipShiftService = inject(ZipShiftService);

  readonly dialog = inject(MatDialog);
  readonly notification = inject(NotificationService);

  isZipOpen = signal(false);

  resize = signal(true);
  resizeSpeed = signal(66);
  maxSpeedDeviation = signal(`±4`);
  resizeMinDuration = signal(7);
  resizeReductionTrashhold = signal(4);

  shift = signal(true);
  selectedDirection = signal(1);
  zippedOnDutyDuration = signal(15);
  shiftMinTimeFrame = signal(5);
  shiftBreak = signal<boolean | null>(true);
  engineOffIdleTimeSpawn = signal(12);
  shiftDirection = computed<'Past' | 'Future'>(() => {
    return this.selectedDirection() ? 'Future' : 'Past';
  });
  shiftOriginalEventDuration = signal<{ [id: number]: number }>({});

  fill = signal<boolean | null>(false);
  fillOption = signal(1);
  gapMinDuration = signal(8);
  fillStatus = computed(() =>
    this.fillOption() === 0
      ? 'ChangeToSleeperBerthStatus'
      : 'ChangeToOffDutyStatus',
  );

  preformSmartFix = signal(true);

  /** TEST HARNESS: when true, the zip pipeline logs its planned operations
   *  (via ApiOperationsService.dryRun) instead of writing, and skips smart fix.
   *  Off by default; reset after every run. */
  dryRun = signal(false);

  /** Restore every zip parameter to its initial default value. */
  resetToDefaults() {
    this.resize.set(true);
    this.resizeSpeed.set(66);
    this.maxSpeedDeviation.set(`±4`);
    this.resizeMinDuration.set(7);
    this.resizeReductionTrashhold.set(4);

    this.shift.set(true);
    this.selectedDirection.set(1);
    this.zippedOnDutyDuration.set(15);
    this.shiftMinTimeFrame.set(5);
    this.shiftBreak.set(true);
    this.engineOffIdleTimeSpawn.set(12);

    this.fill.set(false);
    this.fillOption.set(1);
    this.gapMinDuration.set(8);

    this.preformSmartFix.set(true);
  }

  title = computed(() => {
    const resize = this.resize();
    const shift = this.shift();
    const shiftDirection = this.selectedDirection();
    const fill = this.fill();
    const fillOption = this.fillOption();
    const shiftBreak = this.shiftBreak();
    const title = shiftBreak ? 'zi_p' : 'zip';
    const direction = shift
      ? shiftDirection
        ? ['>[', '>]']
        : ['[<', ']<']
      : ['[', ']'];
    const gap = fill ? (fillOption ? ':' : '.') : ' ';
    return `${direction[0]}${resize ? gap : ''}|${resize ? title : title.toUpperCase()}|${resize ? gap : ''}${direction[1]}`;
  });

  fixFillState = effect(() => {
    const resize = this.resize();
    const shift = this.shift();
    if (resize) this.fill.update((prevV) => (prevV === null ? true : false));
    else this.fill.update((prevV) => (prevV === true ? null : false));
    if (shift)
      this.shiftBreak.update((prevV) =>
        prevV === null || prevV === true ? true : false,
      );
    else
      this.shiftBreak.update((prevV) =>
        prevV === true || prevV === null ? null : false,
      );
  });

  // estimate zipped duration
  estimatedZippedDuration = computed<{
    shift: string;
    drive: string;
  }>(() => {
    const selectedEvents = this.monitorService.selectedEvents();
    const allEvents = this.monitorService.computedDailyLogEvents();

    if (!allEvents) return { shift: '00:00', drive: '00:00' };

    let { 0: firstSelected, [selectedEvents.length - 1]: lastSelected } =
      selectedEvents.sort((a, b) => getTime(a) - getTime(b));

    // define zip range
    const startTime = getTime(firstSelected);
    const endTime = getTime(lastSelected);

    // Filter events within the selected time range
    const zipEvents = allEvents.filter((e) => {
      const eventTime = getTime(e);
      return eventTime >= startTime && eventTime <= endTime;
    });

    // Filter for duty status events
    const dutyStatuses = zipEvents.filter((event) =>
      dutyStatusNames.has(event.statusName),
    );

    const drivingMinDuration = this.resizeMinDuration() * 60 + 45; // Minimum driving duration (seconds)
    const resizeSpeed = this.resizeSpeed(); // Speed used for resizing calculation
    const isShiftActive = this.shift();
    const isResizeActive = this.resize();
    const zippedOnDutyLimit = this.zippedOnDutyDuration() * 60; // Max On Duty duration for 'zipped' events (seconds)

    // resized duration for a single Driving event.
    const calculateResizedDrivingDuration = (event: IEvent): number => {
      if (!event.realDurationInSeconds) return event.durationInSeconds;
      if (!event.averageSpeed)
        return Math.min(drivingMinDuration, event.durationInSeconds);

      const originalSpeed = event.averageSpeed * 10000;
      const originalDuration = event.durationInSeconds;
      // Distance = Speed * Time (Original)
      const distance = originalSpeed * (originalDuration / 3600);
      // New Duration (seconds) = (Distance / New Speed) * 3600
      const newDuration = ((distance / resizeSpeed) * 3600) / 10000;

      const minOfNewAndOriginal = Math.min(newDuration, originalDuration);

      if (drivingMinDuration > minOfNewAndOriginal) {
        return drivingMinDuration;
      } else {
        return minOfNewAndOriginal;
      }
    };

    // duration for a non-Driving duty status event in the 'shift' scenario.
    const calculateShiftNonDrivingDuration = (
      event: IEvent,
      isLastEvent: boolean,
    ): number => {
      if (isLastEvent) return 0;
      if (!isShiftActive) return event.durationInSeconds;

      // Logic for shift() is true
      if (event.pti === -9999) {
        return event.durationInSeconds;
      } else {
        // on-duty duration limit
        return Math.min(event.durationInSeconds, zippedOnDutyLimit);
      }
    };

    // --- Main Logic: Scenario 1 (Resize Active and Shift Inactive) ---

    if (!isShiftActive && isResizeActive) {
      let totalDurationInSeconds = 0;
      let drivingAccumulation = 0;

      // Find the last Driving event for special handling in totalDurationInSeconds calculation
      const lastDrivingEventId = dutyStatuses
        .slice()
        .reverse()
        .find(
          (event) =>
            event.statusName === 'Driving' && event.realDurationInSeconds,
        )?.id;

      // 1. Calculate Total Shift Duration
      totalDurationInSeconds = dutyStatuses.reduce((acc, event) => {
        const isLastDutyStatus =
          event.id === dutyStatuses[dutyStatuses.length - 1].id;
        const isLastDriving = event.id === lastDrivingEventId;

        if (event.statusName === 'Driving') {
          const duration = calculateResizedDrivingDuration(event);
          if (isLastDriving) {
            return acc + calculateResizedDrivingDuration(event);
          } else if (isLastDutyStatus) {
            // Original code explicitly returns 0 for the absolute last duty status event
            return acc + 0;
          } else {
            // For all other duty statuses (Driving or not), use the original duration
            return acc + event.durationInSeconds;
          }
        }

        if (isLastDutyStatus) return acc + 0;
        return acc + event.durationInSeconds;
      }, 0);

      // 2. Calculate Driving Accumulation (Applies the resizing logic to ALL Driving events)
      drivingAccumulation = dutyStatuses.reduce((acc, event) => {
        if (event.statusName === 'Driving') {
          return acc + calculateResizedDrivingDuration(event);
        }
        return acc;
      }, 0);

      return {
        shift: getDuration(totalDurationInSeconds),
        drive: getDuration(drivingAccumulation),
      };
    }

    // --- Main Logic: Scenario 2 (Shift Active OR Resize Inactive) ---

    let totalDurationInSeconds = 0;
    let drivingAccumulation = 0;
    let drivingAccumulationStart: boolean | null = this.shiftBreak()
      ? false
      : null;

    totalDurationInSeconds = dutyStatuses.reduce((acc, event, index) => {
      const isLastEvent = index === dutyStatuses.length - 1;
      let eventDuration = 0;
      let halfHourBreak = 0;

      switch (event.statusName) {
        case 'On Duty':
        case 'Sleeper Berth':
        case 'Off Duty': {
          eventDuration = calculateShiftNonDrivingDuration(event, isLastEvent);
          return acc + eventDuration;
        }
        case 'Driving': {
          // Start driving accumulation for the 30-min break check
          if (drivingAccumulationStart === false) {
            drivingAccumulationStart = true;
          }

          if (!isResizeActive) {
            eventDuration = event.durationInSeconds;
          } else {
            // Resize is active, apply the duration calculation
            eventDuration = calculateResizedDrivingDuration(event);

            // Calculate the half-hour break duration to add if required
            halfHourBreak =
              zippedOnDutyLimit > 1800 ? 0 : 1800 - zippedOnDutyLimit;
          }

          // Accumulate driving time regardless of resize
          drivingAccumulation += eventDuration;

          // Check for 30-min break rule
          if (
            isResizeActive && // Only check this logic when resize is active
            drivingAccumulation >= 28800 &&
            drivingAccumulationStart !== null
          ) {
            drivingAccumulationStart = null; // Mark break requirement as met
            return acc + eventDuration + halfHourBreak;
          }

          return acc + eventDuration;
        }
        default: {
          return acc + 0;
        }
      }
    }, 0);

    return {
      shift: getDuration(totalDurationInSeconds),
      drive: getDuration(drivingAccumulation),
    };
  });

  /** Co-driver computed events for one day (guard use only); [] when none. */
  private coEventsForDate$(
    tenant: ITenant,
    date: string,
    mainDdle: IDriverDailyLogEvents,
  ): Observable<IEvent[]> {
    const coId = mainDdle.coDrivers?.[0]?.id;
    if (!coId) return of([] as IEvent[]);
    return this.apiService.getDriverDailyLogEvents(coId, date, tenant.id).pipe(
      map((coDdle) =>
        this.computeEventsService.getComputedEvents({
          driverDailyLog: coDdle,
          coDriverDailyLog: null,
        }),
      ),
      catchError(() => of([] as IEvent[])),
    );
  }

  /** Build the zip data from aggregated main-driver events + store the original
   *  non-driving durations used later by the shift step. */
  private buildZipData$(mainEvents: IEvent[], coEvents: IEvent[]) {
    return this.zipInitializationService.initializeZipEvents(mainEvents).pipe(
      tap((zipData) => {
        // Verification aid (see dry-run harness): the derived range + counts.
        console.log('[ZIP prepare]', {
          startTime: new Date(zipData.startTime).toISOString(),
          endTime: new Date(zipData.endTime).toISOString(),
          zipEvents: zipData.zipEvents.length,
          mainEvents: mainEvents.length,
          coEvents: coEvents.length,
        });

        const nonDrivingEvents = zipData.zipEvents.filter((event) =>
          ['Off Duty', 'On Duty', 'Sleeper Berth'].includes(event.statusName),
        );

        const shiftOriginalEventDuration: { [key: number]: number } =
          Object.fromEntries(
            nonDrivingEvents.map((event) => [
              event.id,
              event.durationInSeconds,
            ]),
          );

        this.shiftOriginalEventDuration.set(shiftOriginalEventDuration);
      }),
      map((zipData) => ({ zipData, mainEvents, coEvents })),
    );
  }

  /** Single-day prepare: main + co for one date (existing behaviour). */
  private prepareSingleDay$(tenant: ITenant, driverId: number, date: string) {
    return this.apiService
      .getDriverDailyLogEvents(driverId, date, tenant.id)
      .pipe(
        switchMap((mainDdle) => {
          const mainEvents = this.computeEventsService.getComputedEvents({
            driverDailyLog: mainDdle,
            coDriverDailyLog: null,
          });
          return this.coEventsForDate$(tenant, date, mainDdle).pipe(
            switchMap((coEvents) => this.buildZipData$(mainEvents, coEvents)),
          );
        }),
      );
  }

  /** Multi-day prepare: fetch every selected day, aggregate the main driver's
   *  events with the multi-day engine (main-driver only), and collect the
   *  co-driver events per day for the conflict guard. */
  private prepareMultiDay$(
    tenant: ITenant,
    driverId: number,
    dates: string[],
  ) {
    const perDay$ = dates.map((d) =>
      this.apiService.getDriverDailyLogEvents(driverId, d, tenant.id).pipe(
        switchMap((mainDdle) =>
          this.coEventsForDate$(tenant, d, mainDdle).pipe(
            map((coEvents) => ({ mainDdle, coEvents })),
          ),
        ),
      ),
    );

    return forkJoin(perDay$).pipe(
      switchMap((results) => {
        const mainDays = results.map((r) => ({
          driverDailyLog: r.mainDdle,
          coDriverDailyLog: null,
        }));
        const mainEvents =
          this.computeEventsService.getComputedEventsMultiDay(mainDays);
        const coEvents = results.flatMap((r) => r.coEvents);
        return this.buildZipData$(mainEvents, coEvents);
      }),
    );
  }

  zip(tenant: ITenant, driverId: number, date: string) {
    if (!tenant || !driverId || !date) {
      return this.notification.error('[ZIP] Error: Missing data');
    }

    this.isZipOpen.set(true);

    // The selection may span multiple days; each distinct log date becomes a
    // day to fetch. Single day → existing per-day path (untouched); multiple →
    // the aggregated multi-day engine. Range endpoints come from
    // initializeZipEvents (min/max selected event time, already cross-day).
    const selectedDates = [
      ...new Set(this.monitorService.selectedEvents().map((e) => e.date)),
    ];

    const prepare$ =
      selectedDates.length > 1
        ? this.prepareMultiDay$(tenant, driverId, selectedDates)
        : this.prepareSingleDay$(tenant, driverId, date);

    return prepare$.subscribe({
      next: ({ zipData, mainEvents, coEvents }) => {
        const { startTime, endTime } = zipData;

        // GUARD 1 — co-driver conflict → HARD ERROR / abort. A co-driver event
        // within the range that shares a vehicle with the main driver's
        // in-range events means the zip would rewrite shared-truck history.
        const mainVehicleIds = new Set(
          mainEvents
            .filter((e) => {
              const t = getTime(e);
              return t >= startTime && t <= endTime;
            })
            .map((e) => e.vehicleId)
            .filter((v): v is number => v != null),
        );
        const hasCoDriverConflict = coEvents.some((e) => {
          const t = getTime(e);
          return (
            t >= startTime &&
            t <= endTime &&
            e.vehicleId != null &&
            mainVehicleIds.has(e.vehicleId)
          );
        });
        if (hasCoDriverConflict) {
          this.isZipOpen.set(false);
          this.notification.error(
            '[ZIP] ERROR: a co-driver shares a vehicle within this range — aborting.',
            { action: 'Close' },
          );
          return;
        }

        // GUARD 2 — anomaly → cancel / ignore WARNING.
        const anomalies = mainEvents.filter((e) => {
          const t = getTime(e);
          return (
            t >= startTime &&
            t <= endTime &&
            (e.isTeleport || e.locationMismatch || !!e.errorMessages?.length)
          );
        });

        if (!anomalies.length) {
          this.openZipConfig(tenant, driverId, date, zipData);
          return;
        }

        const preview = anomalies
          .slice(0, 5)
          .map((e) => `#${e.viewId} ${e.statusName}`)
          .join(', ');
        this.dialog
          .open(DialogConfirmComponent, {
            width: '260px',
            data: {
              title: 'Anomalies in range',
              message: 'Proceed with zip anyway?',
              info: `${anomalies.length} anomalous event${anomalies.length === 1 ? '' : 's'}: ${preview}${anomalies.length > 5 ? '…' : ''}`,
              warning: 'Teleport / location mismatch / errored events found.',
            },
          })
          .afterClosed()
          .subscribe((proceed) => {
            if (!proceed) {
              this.isZipOpen.set(false);
              return;
            }
            this.openZipConfig(tenant, driverId, date, zipData);
          });
      },
      error: (err: any) => {
        this.isZipOpen.set(false);
        const message = err?.error?.message
          ? `[ZIP] ERROR: ${err.error.message}`
          : `[ZIP] ERROR: ${err}`;
        this.notification.error(message, { action: 'Close' });
      },
    });
  }

  /** Open the zip configuration dialog for the prepared range; on confirm,
   *  enqueue the resize → shift → smart-fix pipeline. */
  private openZipConfig(
    tenant: ITenant,
    driverId: number,
    date: string,
    zipData: IZipInitializationData,
  ) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {
      zipData$: of(zipData),
    };
    dialogConfig.position = {
      top: '50px',
    };

    return this.dialog
      .open(ZipDialogComponent, dialogConfig)
      .afterClosed()
      .subscribe((result: IZipInitializationData | undefined) => {
        if (!result) {
          this.isZipOpen.set(false);
          return;
        }

        // Confirmed zip: auto-open the task-queue panel so its progress is
        // visible while the pipeline runs.
        this.taskQueueService.opened.set(true);

        // Each enabled operation is a "phase" surfaced in the task queue as
        // `n/total Name`; sub-steps inside a phase show as `subtask` progress.
        const phases: string[] = [];
        if (this.resize()) phases.push('Resizing');
        if (this.shift()) phases.push('Shifting');
        if (this.preformSmartFix()) phases.push('Smart Fix');
        const totalPhases = phases.length || 1;

        // Per-operation cancellation. `stop$` unsubscribes the in-flight work;
        // `stopped` lets a still-pending task bail out before it starts.
        const stop$ = new Subject<void>();
        let stopped = false;
        let taskId: number | null = null;

        const setPhase = (name: string) => {
          if (taskId === null) return;
          const index = phases.indexOf(name) + 1;
          this.taskQueueService.zip.update(taskId, {
            phase: `${index}/${totalPhases} ${name}`,
            subtask: '',
          });
        };

        const reportSub =
          (label: string) => (done: number, total: number) => {
            if (taskId === null) return;
            this.taskQueueService.zip.update(taskId, {
              subtask: `${label} ${done}/${total}`,
            });
          };

        // Add the configured zip to the end of the monitor queue. The whole
        // resize -> shift -> smart fix pipeline runs when it reaches the front.
        taskId = this.taskQueueService.zip.enqueue(
          'Zip',
          () => {
            // Stopped while still pending — never start.
            if (stopped) return EMPTY;

            // Apply the dry-run flag for the duration of this pipeline.
            this.apiOperationsService.dryRun.set(this.dryRun());

            return of(result).pipe(
              // 1. Prepare resize items
              map((zipData) => ({
                ...zipData,
                resizeItems: this.zipResizeService.createResizeItems(
                  zipData.zipEvents,
                  zipData.eventsWithPotentialGaps,
                  this.resizeSpeed(),
                  this.resizeMinDuration(),
                  +this.maxSpeedDeviation().slice(1),
                  !!this.fill(),
                  this.gapMinDuration(),
                  this.resizeReductionTrashhold(),
                  this.shiftDirection(),
                ),
              })),
              // 2. Conditional operation sequence (Resize -> Shift). `defer`
              //    delays each phase's side effects until it actually runs.
              switchMap(({ resizeItems, ...zipData }) => {
                const resize$ = defer(() => {
                  setPhase('Resizing');
                  return this.zipResizeService.processResizeItems(
                    tenant,
                    resizeItems,
                    this.resize(),
                    this.fillStatus(),
                    reportSub('resize'),
                  );
                });

                const shift$ = defer(() => {
                  setPhase('Shifting');
                  return this.zipShiftService
                    .processShift(
                      tenant,
                      driverId,
                      date,
                      zipData,
                      this.shift(),
                      this.shiftDirection(),
                      this.zippedOnDutyDuration(),
                      this.shiftMinTimeFrame(),
                      !!this.shiftBreak(),
                      this.preformSmartFix()
                        ? this.engineOffIdleTimeSpawn()
                        : 0,
                      this.shiftOriginalEventDuration(),
                      reportSub('shift'),
                    )
                    .pipe(toArray());
                });

                if (this.resize() && this.shift()) {
                  return resize$.pipe(mergeMap(() => shift$));
                } else if (this.resize()) {
                  return resize$;
                } else if (this.shift()) {
                  return shift$;
                } else {
                  return of({});
                }
              }),
              // 3. Optional smart fix
              switchMap(() => {
                // Smart fix hits the API directly (not guarded by dryRun), so
                // skip it entirely during a dry run.
                if (!this.preformSmartFix() || this.dryRun()) return of({});
                setPhase('Smart Fix');
                return this.smartFixService.smartFix(tenant.id, driverId, date);
              }),
              // Stopping completes the stream, unsubscribing in-flight requests.
              takeUntil(stop$),
            );
          },
          {
            complete: () => {
              this.apiOperationsService.dryRun.set(false);
              this.isZipOpen.set(false);
              this.monitorService.selectedEvents.set([]);
              if (stopped) {
                this.notification.info('[ZIP] Stopped');
              } else {
                this.notification.success('[ZIP] Completed', {
                  duration: 3500,
                });
              }
              this.monitorService.refreshDailyLogs();
              this.urlService.refreshWebApp();
            },
            error: (err: any) => {
              this.apiOperationsService.dryRun.set(false);
              this.isZipOpen.set(false);
              const message = err.error?.message
                ? `[ZIP] ERROR: ${err.error.message}`
                : `[ZIP] ERROR: ${err}`;
              this.notification.error(message, { action: 'Close' });
            },
          },
          {
            cancel: () => {
              stopped = true;
              stop$.next();
              stop$.complete();
            },
          },
        );
      });
  }
}
