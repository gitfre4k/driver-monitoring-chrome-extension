import { computed, inject, Injectable, signal, effect } from "@angular/core";
import { MonitorService } from "./monitor.service";
import { IEvent } from "../interfaces/driver-daily-log-events.interface";
import {
  deletableStatusNames,
  dutyStatusNames,
  getDuration,
  getMinusOneToTwoSecDateISO,
  getRandomIntInclusive,
  getTime,
  timeToSeconds,
} from "../helpers/zip.helpers";
import { ApiOperationsService } from "./api-operations.service";
import {
  catchError,
  concatMap,
  from,
  mergeMap,
  of,
  switchMap,
  throwError,
} from "rxjs";
import { ITenant } from "../interfaces";
import { ApiService } from "./api.service";

import { UrlService } from "./url.service";
import { MatDialog } from "@angular/material/dialog";
import { ZipDialogComponent } from "../components/UI/zip-dialog/zip-dialog.component";
import { MatSnackBar } from "@angular/material/snack-bar";
import { ProceedWithAdvancedResizeDialogComponent } from "../components/UI/proceed-with-advanced-resize-dialog/proceed-with-advanced-resize-dialog.component";
import { parseErrorMessage } from "../helpers/context-menu.helpers";

@Injectable({
  providedIn: "root",
})
export class ZipService {
  monitorService = inject(MonitorService);
  apiService = inject(ApiService);
  apiOperationsService = inject(ApiOperationsService);
  urlService = inject(UrlService);

  readonly dialog = inject(MatDialog);
  readonly _snackBar = inject(MatSnackBar);

  resize = signal(true);
  resizeSpeed = signal<number>(64);
  resizeMinDuration = signal(2);

  shift = signal(true);
  selectedDirection = signal(1);
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

  zippedOnDutyDuration = signal<number>(18);
  preformSmartFix = signal(true);
  delDrivingEngEvents = signal(true);

  fixFillState = effect(() => {
    const resize = this.resize();
    const shift = this.shift();
    if (resize && shift) this.fill.set(false);
  });

  zip() {
    const selectedEvents = this.monitorService.selectedEvents();
    const allEvents = this.monitorService.computedDailyLogEvents();
    const tenant = this.urlService.tenant() as ITenant;
    const { driverId, date } = this.urlService.currentView() ?? {
      driverId: null,
      date: null,
    };

    if (!allEvents || !tenant || !driverId || !date)
      return this._snackBar.open("[ZIP] Error", "OK", { duration: 7000 });

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

    const firstEvent = dutyStatuses[0];

    if (!firstEvent)
      return this._snackBar.open(
        "[ZIP] ERROR: The selected range is not valid.",
        "OK",
        { duration: 7000 },
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

    console.log("eventsWithPotentialGaps ", eventsWithPotentialGaps);

    // .map((event, index) => {
    //   return { id: dutyStatuses[index - 1].id, fillGapEvent: event };
    // })
    // .reduce(
    //   (acc, currentItem) => {
    //     acc[currentItem.id] = currentItem.fillGapEvent;
    //     return acc;
    //   },
    //   {} as { [id: string]: IEvent },
    // );

    const eventsToDelete: IEvent[] = [];

    zipEvents.forEach((event) => {
      deletableStatusNames.has(event.statusName) && eventsToDelete.push(event);
    });

    return this.dialog
      .open(ZipDialogComponent, { data: eventsToDelete })
      .afterClosed()
      .pipe(
        switchMap((result) => {
          if (result) {
            const resize = this.resize();
            const resizeSpeed = this.resizeSpeed();
            const resizeMinDuration = this.resizeMinDuration();
            const resizeItems = zipEvents
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
                  duration: getDuration(minDuration),
                  duplicateForGapFillEvent:
                    this.fill() &&
                    gapDuration >= this.gapMinDuration() * 60 &&
                    eventsWithPotentialGaps[event.id],
                };

                if (!event.averageSpeed) return defaultReturn;
                else {
                  const speed = resizeSpeed - 2.5 + Math.random() * 5;
                  const newSpeed = speed >= 75 ? 74.95 : speed;
                  const originalSpeed = event.averageSpeed * 10000;
                  const originalDuration = event.durationInSeconds;
                  const fillGapMinimalDuration = this.gapMinDuration() * 60; // gap in minutes
                  const distance = originalSpeed * (originalDuration / 3600);
                  const newDuration = ((distance / newSpeed) * 3600) / 10000;

                  if (minDuration > newDuration) return defaultReturn;
                  else {
                    const duration = getDuration(newDuration);
                    const durationDiff = originalDuration - newDuration;
                    const fillGap = durationDiff >= fillGapMinimalDuration;
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

            const resize$ = from(resizeItems).pipe(
              mergeMap((resizeItem) => {
                if (resizeItem.duplicateForGapFillEvent) {
                  const eventToDuplicate = resizeItem.duplicateForGapFillEvent;
                  return this.apiOperationsService
                    .duplicateEvent(tenant, eventToDuplicate, {
                      eventTypeCode: this.fillStatus(),
                      startTime: getMinusOneToTwoSecDateISO(
                        eventToDuplicate.startTime,
                      ),
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
                      if (err.error.code === "ResizeEvents.DifferenceInMiles") {
                        const parsedErrorInfo = parseErrorMessage(
                          err.error.message,
                        );
                        if (parsedErrorInfo) {
                          return this.dialog
                            .open(ProceedWithAdvancedResizeDialogComponent, {
                              data: {
                                title: "Resize Error",
                                info: ` > ${err.error.message}`,
                                message: "Proceed with advanced resize?",
                                event: resizeItem.event,
                              },
                            })
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
                                  return of();
                                }
                              }),
                            );
                        }
                      }
                      return throwError(() => err);
                    }),
                  );
              }),
            );

            if (resize) {
              return resize$;
            } else return of();
          } else {
            return of();
          }
        }),
      )
      .subscribe();
  }
}
