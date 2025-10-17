import { computed, inject, Injectable, signal, effect } from "@angular/core";
import { MonitorService } from "./monitor.service";
import { IEvent } from "../interfaces/driver-daily-log-events.interface";
import {
  deletableStatusNames,
  dutyStatusNames,
  getDuration,
  getMinusOneToTwoSecDateISO,
  getRandomIntInclusive,
  getRangeDuration,
  getTime,
  timeToSeconds,
} from "../helpers/zip.helpers";
import { ApiOperationsService } from "./api-operations.service";
import {
  catchError,
  concatMap,
  from,
  map,
  mergeMap,
  of,
  scan,
  switchMap,
  throwError,
  toArray,
} from "rxjs";
import { ITenant } from "../interfaces";
import { ApiService } from "./api.service";

import { UrlService } from "./url.service";
import { MatDialog } from "@angular/material/dialog";
import { ZipDialogComponent } from "../components/UI/zip-dialog/zip-dialog.component";
import { MatSnackBar } from "@angular/material/snack-bar";
import { ProceedWithAdvancedResizeDialogComponent } from "../components/UI/proceed-with-advanced-resize-dialog/proceed-with-advanced-resize-dialog.component";
import { parseErrorMessage } from "../helpers/context-menu.helpers";
import { IResizeItem } from "../interfaces/zip.interface";
import { ComputeEventsService } from "./compute-events.service";

@Injectable({
  providedIn: "root",
})
export class ZipService {
  monitorService = inject(MonitorService);
  apiService = inject(ApiService);
  apiOperationsService = inject(ApiOperationsService);
  urlService = inject(UrlService);
  computeEventsService = inject(ComputeEventsService);

  readonly dialog = inject(MatDialog);
  readonly _snackBar = inject(MatSnackBar);

  resize = signal(true);
  resizeSpeed = signal<number>(64);
  resizeMinDuration = signal(4);

  shift = signal(true);
  selectedDirection = signal(1);
  zippedOnDutyDuration = signal<number>(18);
  shiftDirection = computed<"Past" | "Future">(() => {
    const selectedDirection = this.selectedDirection();
    return selectedDirection ? "Future" : "Past";
  });

  fill = signal(false);
  fillOption = signal(1);
  gapMinDuration = signal(8);
  fillStatus = computed(() =>
    this.fillOption() === 0
      ? "ChangeToSleeperBerthStatus"
      : "ChangeToOffDutyStatus",
  );

  preformSmartFix = signal(true);
  addEngines = signal(true);

  fixFillState = effect(() => {
    const resize = this.resize();
    const shift = this.shift();
    if (resize && shift) this.fill.set(false);
  });

  estematedZippedDuration = computed(() => {
    const selectedEvents = this.monitorService.selectedEvents();
    const allEvents = this.monitorService.computedDailyLogEvents();
    if (!allEvents) return "00:00";

    const { 0: firstSelected, [selectedEvents.length - 1]: lastSelected } =
      selectedEvents.sort((a, b) => getTime(a) - getTime(b));

    const startTime = getTime(firstSelected);
    const endTime = getTime(lastSelected);

    const zipEvents = allEvents.filter((e) => {
      const eventTime = getTime(e);
      return eventTime >= startTime && eventTime <= endTime;
    });

    const dutyStatuses = zipEvents.filter((event) =>
      dutyStatusNames.has(event.statusName),
    );

    const zippedOnDuty = this.zippedOnDutyDuration() * 60;
    const drivingMinDuration = this.resizeMinDuration() * 60 + 45;
    const speed = this.resizeSpeed();

    const totalDurationInSeconds = dutyStatuses.reduce((acc, event) => {
      switch (event.statusName) {
        case "On Duty": {
          if (event.pti) return acc + 0;
          else {
            return (
              acc +
              (event.durationInSeconds > zippedOnDuty
                ? zippedOnDuty
                : event.durationInSeconds)
            );
          }
        }
        case "Driving": {
          if (!event.averageSpeed)
            return acc + Math.min(drivingMinDuration, event.durationInSeconds);
          else {
            const originalSpeed = event.averageSpeed * 10000;
            const originalDuration = event.durationInSeconds;
            const distance = originalSpeed * (originalDuration / 3600);
            const newDuration = ((distance / speed) * 3600) / 10000;

            if (drivingMinDuration > newDuration)
              return acc + drivingMinDuration;
            else return acc + newDuration;
          }
        }
        default: {
          return (
            acc +
            (event.durationInSeconds > zippedOnDuty
              ? zippedOnDuty
              : event.durationInSeconds)
          );
        }
      }
    }, 0);

    return getDuration(totalDurationInSeconds);
  });

  initializeEvents(allEvents: IEvent[]) {
    const selectedEvents = this.monitorService.selectedEvents();

    const { 0: firstSelected, [selectedEvents.length - 1]: lastSelected } =
      selectedEvents.sort((a, b) => getTime(a) - getTime(b));

    const startTime = getTime(firstSelected);
    const endTime = getTime(lastSelected);

    const zipEvents = allEvents.filter((e) => {
      const eventTime = getTime(e);
      return eventTime >= startTime && eventTime <= endTime;
    });

    const dutyStatuses = zipEvents.filter((event) =>
      dutyStatusNames.has(event.statusName),
    );

    const onDutyIdsToFill = dutyStatuses
      .filter((event, index) => {
        if (
          index !== 0 &&
          event.statusName === "On Duty" &&
          dutyStatuses[index - 1] &&
          dutyStatuses[index - 1]?.statusName === "Driving"
        )
          return true;
        else return false;
      })
      .map((event) => event.id);

    const eventsWithPotentialGaps = {} as { [id: string]: IEvent };

    dutyStatuses.forEach((event, index) => {
      if (onDutyIdsToFill.includes(event.id)) {
        eventsWithPotentialGaps[dutyStatuses[index - 1].id] =
          dutyStatuses[index];
      }
    });

    const eventsToDelete: IEvent[] = [];

    zipEvents.forEach((event) => {
      deletableStatusNames.has(event.statusName) && eventsToDelete.push(event);
    });

    const selectedRangeDuration = getRangeDuration(
      dutyStatuses[0].startTime,
      dutyStatuses[dutyStatuses.length - 1].startTime,
    );

    return of({
      zipEvents: zipEvents.filter((event) => {
        const eventTime = getTime(event);
        return (
          eventTime >= startTime &&
          eventTime <= endTime &&
          dutyStatusNames.has(event.statusName)
        );
      }),
      startTime,
      endTime,
      selectedRangeDuration,
      eventsToDelete,
      eventsWithPotentialGaps,
    });
  }

  zip(tenant: ITenant, driverId: number, date: string) {
    if (!tenant || !driverId || !date)
      return this._snackBar.open("[ZIP] Error", "OK", { duration: 7000 });

    const zipData$ = this.apiService
      .getDriverDailyLogEvents(driverId, date, tenant.id)
      .pipe(
        switchMap((ddle) =>
          this.computeEventsService.getComputedEvents({
            driverDailyLog: ddle,
            coDriverDailyLog: null,
          }),
        ),
        toArray(),
        switchMap((events) => this.initializeEvents(events)),
      );

    return zipData$
      .pipe(
        switchMap((zipData) => {
          const {
            zipEvents,
            eventsToDelete,
            eventsWithPotentialGaps,
            selectedRangeDuration,
            startTime,
            endTime,
          } = zipData;

          return this.dialog
            .open(ZipDialogComponent, {
              data: { eventsToDelete, selectedRangeDuration },
            })
            .afterClosed()
            .pipe(
              switchMap((result) => {
                if (result) {
                  const resize = this.resize();
                  const shift = this.shift();
                  const resizeSpeed = this.resizeSpeed();
                  const resizeMinDuration = this.resizeMinDuration();
                  const resizeItems: IResizeItem[] = zipEvents
                    .filter(
                      (event) =>
                        event.statusName === "Driving" &&
                        event.realEndTime &&
                        event.averageSpeed < resizeSpeed,
                    )
                    .map((event) => {
                      const minDuration =
                        resizeMinDuration * 60 + getRandomIntInclusive(1, 90);

                      const gapDuration = event.durationInSeconds - minDuration;
                      const defaultReturn = {
                        event,
                        duration: getDuration(
                          Math.min(minDuration, event.durationInSeconds),
                        ),
                        duplicateForGapFillEvent:
                          this.fill() &&
                          gapDuration >= this.gapMinDuration() * 60 &&
                          eventsWithPotentialGaps[event.id],
                      };

                      if (!event.averageSpeed) return defaultReturn;
                      else {
                        const speed = resizeSpeed - 4 + Math.random() * 8;
                        const newSpeed = speed >= 75 ? 74.95 : speed;
                        const originalSpeed = event.averageSpeed * 10000;
                        const originalDuration = event.durationInSeconds;
                        const fillGapMinimalDuration =
                          this.gapMinDuration() * 60; // gap in minutes
                        const distance =
                          originalSpeed * (originalDuration / 3600);
                        const newDuration =
                          ((distance / newSpeed) * 3600) / 10000;

                        if (minDuration > newDuration) return defaultReturn;
                        else {
                          const duration = getDuration(newDuration);
                          const durationDiff = originalDuration - newDuration;
                          const fillGap =
                            durationDiff >= fillGapMinimalDuration;
                          const duplicateForGapFillEvent =
                            this.fill() &&
                            fillGap &&
                            eventsWithPotentialGaps[event.id];

                          return {
                            event,
                            duration,
                            duplicateForGapFillEvent,
                          };
                        }
                      }
                    })
                    .filter((resizeItem) => {
                      const targetDuration = timeToSeconds(resizeItem.duration);
                      return targetDuration > resizeMinDuration * 60;
                    });

                  //////////////////////
                  // resize
                  const resize$ = resizeItems.length
                    ? from(resizeItems).pipe(
                        mergeMap((resizeItem) => {
                          if (resizeItem.duplicateForGapFillEvent) {
                            // create gap event
                            const eventToDuplicate =
                              resizeItem.duplicateForGapFillEvent;
                            return this.apiOperationsService
                              .duplicateEvent(tenant, eventToDuplicate, {
                                eventTypeCode: this.fillStatus(),
                                startTime: getMinusOneToTwoSecDateISO(
                                  eventToDuplicate.startTime,
                                ),
                                note: "",
                              })
                              .pipe(mergeMap(() => of(resizeItem)));
                          } else return of(resizeItem);
                        }),
                        concatMap((resizeItem) => {
                          return this.apiOperationsService
                            .resizeEvent(tenant, resizeItem.event.id, {
                              duration: resizeItem.duration,
                              durationAsTimeSpan: `${new Date().getTime()}`,
                            })
                            .pipe(
                              catchError((err: any) => {
                                if (
                                  err.error.code ===
                                  "ResizeEvents.DifferenceInMiles"
                                ) {
                                  // handle mileage difference error
                                  const parsedErrorInfo = parseErrorMessage(
                                    err.error.message,
                                  );
                                  if (parsedErrorInfo) {
                                    return this.dialog
                                      .open(
                                        ProceedWithAdvancedResizeDialogComponent,
                                        {
                                          data: {
                                            title: "Resize Error",
                                            info: ` > ${err.error.message}`,
                                            message:
                                              "Proceed with advanced resize?",
                                            event: resizeItem.event,
                                          },
                                        },
                                      )
                                      .afterClosed()
                                      .pipe(
                                        switchMap((result) => {
                                          if (result) {
                                            return this.apiOperationsService.advancedResize(
                                              tenant,
                                              resizeItem.event,
                                              {
                                                resizePayload: {
                                                  duration: resizeItem.duration,
                                                  durationAsTimeSpan: `${new Date().getTime()}`,
                                                },
                                                parsedErrorInfo,
                                              },
                                            );
                                          } else {
                                            return of({});
                                          }
                                        }),
                                      );
                                  }
                                }
                                return throwError(() => err);
                              }),
                            );
                        }),
                        toArray(),
                      )
                    : of({});
                  //////////////////////////
                  // shift
                  const shift$ = of(eventsToDelete).pipe(
                    map((eventsToDelete) => {
                      if (eventsToDelete.length)
                        return eventsToDelete.map((event) => event.id);
                      else return [];
                    }),
                    switchMap((ids) => {
                      if (ids.length)
                        // delete events
                        return this.apiOperationsService.deleteEvents(
                          tenant,
                          ids,
                        );
                      else return of({});
                    }),
                    switchMap(() =>
                      // get updated events
                      this.apiService
                        .getDriverDailyLogEvents(driverId, date, tenant.id)
                        .pipe(
                          switchMap((ddle) =>
                            this.computeEventsService.getComputedEvents({
                              driverDailyLog: ddle,
                              coDriverDailyLog: null,
                            }),
                          ),
                          toArray(),
                          map((events) =>
                            events.filter((event) => {
                              // filter events to selected range
                              const eventTime = getTime(event);
                              return (
                                eventTime >= startTime &&
                                eventTime <= endTime &&
                                dutyStatusNames.has(event.statusName)
                              );
                            }),
                          ),
                          switchMap((events) => {
                            // sort events to align with shift direction
                            const direction = this.shiftDirection();
                            const reverse = direction === "Past";
                            const sortedEvents = reverse
                              ? events.reverse()
                              : events;
                            const firstShiftEvent = sortedEvents[0];
                            const lastShiftEvent =
                              sortedEvents[sortedEvents.length - 1];
                            const minDutyDuration =
                              this.zippedOnDutyDuration() * 60;

                            return from(sortedEvents).pipe(
                              scan(
                                (
                                  {
                                    accumulatedDrivingDuration,
                                    curentBreakDuration,
                                    lastNonDrivingStatus: {
                                      id,
                                      totalBreakDuration,
                                    },
                                  },
                                  event,
                                ) => {
                                  if (accumulatedDrivingDuration >= 28800) {
                                    return {
                                      accumulatedDrivingDuration: 0,
                                      curentBreakDuration: 0,
                                      lastNonDrivingStatus: {
                                        id: 0,
                                        totalBreakDuration: 0,
                                      },
                                    };
                                  }
                                  // accumulate driving
                                  if (event.statusName === "Driving")
                                    return {
                                      accumulatedDrivingDuration:
                                        accumulatedDrivingDuration +
                                        event.durationInSeconds,
                                      lastNonDrivingStatus: {
                                        id,
                                        totalBreakDuration: curentBreakDuration,
                                      },
                                      curentBreakDuration: 0,
                                    };
                                  else {
                                    // !driving status ref
                                    return {
                                      accumulatedDrivingDuration,
                                      lastNonDrivingStatus: {
                                        id: event.id,
                                        totalBreakDuration:
                                          totalBreakDuration +
                                          event.durationInSeconds,
                                      },
                                      curentBreakDuration:
                                        curentBreakDuration +
                                        event.durationInSeconds,
                                    };
                                  }
                                },
                                {
                                  // initial state
                                  accumulatedDrivingDuration: 0,
                                  curentBreakDuration: 0,
                                  lastNonDrivingStatus: {
                                    id: 0,
                                    totalBreakDuration: 0,
                                  },
                                },
                              ),
                              concatMap(
                                (
                                  {
                                    accumulatedDrivingDuration,
                                    lastNonDrivingStatus,
                                  },
                                  index,
                                ) => {
                                  console.log(
                                    "[ accumulatedDrivingDuration ]",
                                    accumulatedDrivingDuration,
                                  );
                                  console.log(
                                    "[ lastNonDrivingStatus]",
                                    lastNonDrivingStatus,
                                  );

                                  const shiftId = reverse ? index + 1 : index;
                                  const timeToShift =
                                    sortedEvents[shiftId].durationInSeconds -
                                    minDutyDuration -
                                    getRandomIntInclusive(1, 300);
                                  const time = getDuration(timeToShift).slice(
                                    0,
                                    -3,
                                  );
                                  const timeForBreak =
                                    accumulatedDrivingDuration >= 28800;

                                  if (timeForBreak) {
                                    return this.apiOperationsService.shift(
                                      tenant,
                                      [
                                        firstShiftEvent,
                                        sortedEvents[lastNonDrivingStatus.id],
                                      ],
                                      {
                                        direction:
                                          direction === "Past"
                                            ? "Future"
                                            : "Past",
                                        time: getDuration(
                                          30 * 60 -
                                            lastNonDrivingStatus.totalBreakDuration +
                                            getRandomIntInclusive(60, 180),
                                        ),
                                      },
                                    );
                                  }

                                  if (
                                    // shift exeptions
                                    sortedEvents[shiftId].statusName ===
                                      "Driving" ||
                                    sortedEvents[shiftId].id ===
                                      lastShiftEvent.id ||
                                    sortedEvents[shiftId].pti === -9999
                                  )
                                    return of({});
                                  else {
                                    if (timeToShift > 0)
                                      return this.apiOperationsService.shift(
                                        tenant,
                                        [firstShiftEvent, sortedEvents[index]],
                                        {
                                          direction,
                                          time,
                                        },
                                      );
                                    else return of({});
                                  }
                                },
                              ),
                            );
                          }),
                        ),
                    ),
                  );

                  ///////////////////
                  // ZIP
                  if (resize) {
                    return resize$.pipe(
                      mergeMap(() => {
                        if (shift) return shift$;
                        else return of({});
                      }),
                    );
                  } else {
                    if (shift) return shift$;
                    else return of({});
                  }
                } else {
                  return of({});
                }
              }),
            );
        }),
      )

      .subscribe({
        error: (err) => {
          this._snackBar.open(`[ZIP] ERROR: ${err.error.message}`, "Close");
        },
        complete: () => {
          this.monitorService.selectedEvents.set([]);
          this.monitorService.refreshDailyLogs();
        },
      });
  }
}
