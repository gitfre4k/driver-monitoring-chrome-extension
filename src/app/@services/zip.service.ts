import { computed, inject, Injectable, signal } from "@angular/core";
import { MonitorService } from "./monitor.service";
import { IEvent } from "../interfaces/driver-daily-log-events.interface";
import {
  getDuration,
  getRandomIntInclusive,
  getTime,
} from "../helpers/zip.helpers";
import { ApiOperationsService } from "./api-operations.service";
import {
  catchError,
  concat,
  concatMap,
  from,
  of,
  switchMap,
  tap,
  throwError,
} from "rxjs";
import { ITenant } from "../interfaces";
import { ApiService } from "./api.service";
import { parseErrorMessage } from "../helpers/context-menu.helpers";
import { UrlService } from "./url.service";
import { MatDialog } from "@angular/material/dialog";
import { ZipDialogComponent } from "../components/UI/zip-dialog/zip-dialog.component";
import { MatSnackBar } from "@angular/material/snack-bar";
import { ProceedWithAdvancedResizeDialogComponent } from "../components/UI/proceed-with-advanced-resize-dialog/proceed-with-advanced-resize-dialog.component";

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

  selectedMode = signal(1);
  mode = computed(() => {
    const selectedMode = this.selectedMode();
    switch (selectedMode) {
      case 0:
        return { speed: 64, dutyDuration: 1080 };
      case 1:
        return { speed: 68, dutyDuration: 900 };
      case 2:
        return { speed: 74, dutyDuration: 240 };
      default:
        return { speed: 68, dutyDuration: 900 };
    }
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
    const toZipEvents = allEvents.filter(
      (e) =>
        getTime(e) >= getTime(firstSelected) &&
        getTime(e) <= getTime(lastSelected),
    );

    if (
      firstSelected.statusName === "Intermediate" ||
      lastSelected.statusName === "Intermediate"
    )
      return this._snackBar.open(
        "[ZIP] Error: Intermediate event cannot be the first/last selected event.",
        "OK",
        { duration: 7000 },
      );

    let first!: IEvent;

    for (let i = 0; i < toZipEvents.length; i++) {
      if (first) continue;
      else if (
        ["On Duty", "Sleeper Berth", "Off Duty", "Driving"].includes(
          toZipEvents[i].statusName,
        )
      )
        first = toZipEvents[i];
    }

    if (!first)
      return this._snackBar.open(
        "[ZIP] Error: The selected range is not valid.",
        "OK",
        { duration: 7000 },
      );
    console.log(first);

    const deleteEventInfo: IEvent[] = [];

    for (let i = 0; i < toZipEvents.length; i++) {
      if (
        [
          "Engine On",
          "Engine Off",
          "Login",
          "Logout",
          "Diagnostic",
          "Diag. CLR",
        ].includes(toZipEvents[i].statusName)
      ) {
        deleteEventInfo.push(toZipEvents[i]);
      }
    }

    return this.dialog
      .open(ZipDialogComponent, { data: deleteEventInfo })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          const toResize = [] as {
            event: IEvent;
            duration: string;
          }[];
          const toShiftEventIds: number[] = [];

          for (let i = 0; i < toZipEvents.length; i++) {
            const event = toZipEvents[i];
            if (event.statusName === "Driving") {
              if (event.averageSpeed) {
                const newSpeed =
                  this.selectedMode() === 2
                    ? 74.95
                    : this.mode().speed + Math.random() * 4;
                const originalSpeed = event.averageSpeed * 10000;
                const originalDuration = event.durationInSeconds;
                const distance = originalSpeed * (originalDuration / 3600);
                const newDuratiom = ((distance / newSpeed) * 3600) / 10000;

                const duration = getDuration(newDuratiom);

                toResize.push({
                  event,
                  duration,
                });
              } else {
                if (event.realEndTime) {
                  toResize.push({
                    event,
                    duration: getDuration(getRandomIntInclusive(6, 606)),
                  });
                }
              }
            }

            if (
              ["On Duty", "Sleeper Berth", "Off Duty"].includes(
                event.statusName,
              )
            ) {
              toShiftEventIds.push(event.id);
            }
          }

          ///////////////
          // delete obs
          const delete$ = this.apiOperationsService
            .deleteEvents(
              tenant,
              deleteEventInfo.map((e) => e.id),
            )
            .pipe(
              tap((resData) =>
                console.log("[ZIP] deleting events...", resData),
              ),
            );
          ///////////////
          // resize obs
          const resizeObs = toResize.map((resInf) =>
            this.apiOperationsService
              .resizeEvent(tenant, resInf.event.id, {
                duration: resInf.duration,
                durationAsTimeSpan: `${new Date().getTime()}`,
              })
              .pipe(
                tap((resData) => console.log("[ZIP] resizing...", resData)),
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
                            info: err.error.message, // Corrected line
                            message: "Proceed with advanced resize?",
                          },
                        })
                        .afterClosed()
                        .pipe(
                          switchMap((result) => {
                            if (result) {
                              return this.apiOperationsService.advancedResize(
                                tenant,
                                resInf.event,
                                {
                                  resizePayload: {
                                    duration: resInf.duration,
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
              ),
          );
          const resize$ = from(resizeObs).pipe(concatMap((obs) => obs));
          ///////////////
          // shift obs
          const shift$ = this.apiService
            .getDriverDailyLogEvents(driverId, date, tenant.id)
            .pipe(
              concatMap((log) =>
                from(
                  log.events.filter(
                    (e) =>
                      toShiftEventIds.includes(e.id) &&
                      e.id !== toShiftEventIds[toShiftEventIds.length - 1],
                  ),
                ),
              ),
              concatMap((last) =>
                this.apiOperationsService
                  .shift(tenant, [first, last], {
                    direction: "Future",
                    time:
                      last.id === first.id
                        ? "00:00"
                        : getDuration(
                            (last.realDurationInSeconds
                              ? last.realDurationInSeconds
                              : last.durationInSeconds) >
                              this.mode().dutyDuration * 1.85
                              ? (last.realDurationInSeconds
                                  ? last.realDurationInSeconds
                                  : last.durationInSeconds) -
                                  this.mode().dutyDuration +
                                  getRandomIntInclusive(0, 300)
                              : 0,
                          ).slice(0, -3),
                  })
                  .pipe(
                    tap((resData) => console.log("[ZIP] shifting...", resData)),
                  ),
              ),
            );

          const zip$ = concat(delete$, resize$, shift$);

          return zip$.subscribe({
            error: (err) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              return this._snackBar.open(
                `[ZIP] Error: ${err.error.message}`,
                "OK",
                { duration: 7000 },
              );
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              return this._snackBar.open(
                `[ZIP] operation was successfully executed.`,
                "OK",
                {
                  duration: 3000,
                },
              );
            },
          });
        } else return;
      });
  }
}
