import { computed, inject, Injectable, signal, effect } from "@angular/core";
import { MonitorService } from "./monitor.service";

import { dutyStatusNames, getDuration, getTime } from "../helpers/zip.helpers";
import { ApiOperationsService } from "./api-operations.service";
import { map, mergeMap, of, switchMap, toArray, EMPTY, tap } from "rxjs";
import { ITenant } from "../interfaces";
import { ApiService } from "./api.service";
import { UrlService } from "./url.service";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { ZipDialogComponent } from "../components/UI/zip-dialog/zip-dialog.component";
import { MatSnackBar } from "@angular/material/snack-bar";

import { ComputeEventsService } from "./compute-events.service";
import { ZipInitializationService } from "./zip-initialization.service";
import { ZipResizeService } from "./zip-resize.service";
import { ZipShiftService } from "./zip-shift.service";
import { IZipInitializationData } from "../interfaces/zip.interface";
import { SmartFixService } from "./smart-fix.service";
import { TaskQueueService } from "./task-queue.service";
import { DateTime } from "luxon";

@Injectable({
  providedIn: "root",
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
  readonly _snackBar = inject(MatSnackBar);

  zipId = 0;

  resize = signal(true);
  resizeSpeed = signal(64);
  maxSpeedDeviation = signal(`±5`);
  resizeMinDuration = signal(7);
  resizeReductionTrashhold = signal(4);

  shift = signal(true);
  selectedDirection = signal(1);
  zippedOnDutyDuration = signal(15);
  shiftMinTimeFrame = signal(5);
  shiftBreak = signal<boolean | null>(true);
  engineOffIdleTimeSpawn = signal(8);
  shiftDirection = computed<"Past" | "Future">(() => {
    return this.selectedDirection() ? "Future" : "Past";
  });
  shiftOriginalEventDuration = signal<{ [id: number]: number }>({});

  fill = signal<boolean | null>(false);
  fillOption = signal(1);
  gapMinDuration = signal(8);
  fillStatus = computed(() =>
    this.fillOption() === 0
      ? "ChangeToSleeperBerthStatus"
      : "ChangeToOffDutyStatus",
  );

  preformSmartFix = signal(true);

  title = computed(() => {
    const resize = this.resize();
    const shift = this.shift();
    const shiftDirection = this.selectedDirection();
    const fill = this.fill();
    const fillOption = this.fillOption();
    const shiftBreak = this.shiftBreak();
    const title = shiftBreak ? "zi_p" : "zip";
    const direction = shift
      ? shiftDirection
        ? [">[", ">]"]
        : ["[<", "]<"]
      : ["[", "]"];
    const gap = fill ? (fillOption ? ":" : ".") : " ";
    return `${direction[0]}${resize ? gap : ""}|${resize ? title : title.toUpperCase()}|${resize ? gap : ""}${direction[1]}`;
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

  estimatedZippedDuration = computed<{
    shift: string;
    drive: string;
  }>(() => {
    const selectedEvents = this.monitorService.selectedEvents();
    const allEvents = this.monitorService.computedDailyLogEvents();
    if (!allEvents) return { shift: "00:00", drive: "00:00" };

    let totalDurationInSeconds = 0;
    let drivingAccumulation = 0;

    let drivingAccumulationStart: boolean | null = this.shiftBreak()
      ? false
      : null;

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

    const drivingMinDuration = this.resizeMinDuration() * 60 + 45;
    const speed = this.resizeSpeed();

    if (!this.shift() && this.resize()) {
      const lastDrivingEventId = dutyStatuses
        .slice()
        .reverse()
        .find((event) => event.statusName === "Driving")?.id;

      totalDurationInSeconds = dutyStatuses.reduce((acc, event) => {
        if (event.id === lastDrivingEventId) {
          if (!event.averageSpeed)
            return acc + Math.min(drivingMinDuration, event.durationInSeconds);
          else {
            const originalSpeed = event.averageSpeed * 10000;
            const originalDuration = event.durationInSeconds;
            const distance = originalSpeed * (originalDuration / 3600);
            const newDuration = ((distance / speed) * 3600) / 10000;

            if (
              drivingMinDuration >
              Math.min(newDuration, event.durationInSeconds)
            ) {
              return acc + drivingMinDuration;
            } else return acc + Math.min(newDuration, event.durationInSeconds);
          }
        }
        if (event.id === dutyStatuses[dutyStatuses.length - 1].id)
          return acc + 0;
        else return acc + event.durationInSeconds;
      }, 0);

      drivingAccumulation = dutyStatuses.reduce((acc, event) => {
        if (event.statusName === "Driving") {
          if (!event.averageSpeed) {
            return acc + Math.min(drivingMinDuration, event.durationInSeconds);
          } else {
            const originalSpeed = event.averageSpeed * 10000;
            const originalDuration = event.durationInSeconds;
            const distance = originalSpeed * (originalDuration / 3600);
            const newDuration = ((distance / speed) * 3600) / 10000;

            if (
              drivingMinDuration >
              Math.min(newDuration, event.durationInSeconds)
            ) {
              return acc + drivingMinDuration;
            } else return acc + Math.min(newDuration, event.durationInSeconds);
          }
        } else {
          return acc;
        }
      }, 0);

      return {
        shift: getDuration(totalDurationInSeconds),
        drive: getDuration(drivingAccumulation),
      };
    } else {
      totalDurationInSeconds = dutyStatuses.reduce((acc, event) => {
        switch (event.statusName) {
          case "On Duty":
          case "Sleeper Berth":
          case "Off Duty": {
            if (event.id === dutyStatuses[dutyStatuses.length - 1].id)
              return acc + 0;
            else if (!this.shift()) return acc + event.durationInSeconds;
            else {
              if (event.pti === -9999) return acc + event.durationInSeconds;
              else {
                return (
                  acc +
                  (event.durationInSeconds < this.zippedOnDutyDuration() * 60
                    ? event.durationInSeconds
                    : this.zippedOnDutyDuration() * 60)
                );
              }
            }
          }
          case "Driving": {
            // start driving accumulation
            drivingAccumulationStart === false &&
              (drivingAccumulationStart = true);

            // accumulation
            if (!this.resize()) {
              drivingAccumulation += event.durationInSeconds;
              return acc + event.durationInSeconds;
            } else if (!event.averageSpeed) {
              drivingAccumulation += Math.min(
                drivingMinDuration,
                event.durationInSeconds,
              );
              return (
                acc + Math.min(drivingMinDuration, event.durationInSeconds)
              );
            } else {
              const originalSpeed = event.averageSpeed * 10000;
              const originalDuration = event.durationInSeconds;
              const distance = originalSpeed * (originalDuration / 3600);
              const newDuration = ((distance / speed) * 3600) / 10000;

              const halfHourBreak =
                this.zippedOnDutyDuration() * 60 > 1800
                  ? 0
                  : 1800 - this.zippedOnDutyDuration() * 60;

              if (
                drivingMinDuration >
                Math.min(newDuration, event.durationInSeconds)
              ) {
                drivingAccumulation += drivingMinDuration;
                // check for 30-min break
                if (
                  drivingAccumulation >= 480 &&
                  drivingAccumulationStart !== null
                ) {
                  drivingAccumulationStart = null;
                  return acc + drivingMinDuration + halfHourBreak;
                } else return acc + drivingMinDuration;
              } else {
                drivingAccumulation += Math.min(
                  newDuration,
                  event.durationInSeconds,
                );
                // check for 30-min break
                if (
                  drivingAccumulation >= 480 &&
                  drivingAccumulationStart !== null
                ) {
                  drivingAccumulationStart = null;
                  return (
                    acc +
                    Math.min(newDuration, event.durationInSeconds) +
                    halfHourBreak
                  );
                } else
                  return acc + Math.min(newDuration, event.durationInSeconds);
              }
            }
          }
          default: {
            return acc + 0;
          }
        }
      }, 0);
    }
    return {
      shift: getDuration(totalDurationInSeconds),
      drive: getDuration(drivingAccumulation),
    };
  });

  zip(tenant: ITenant, driverId: number, date: string) {
    if (!tenant || !driverId || !date) {
      return this._snackBar.open("[ZIP] Error: Missing data", "OK", {
        duration: 7000,
      });
    }

    this.zipId++;

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
        switchMap((events) =>
          this.zipInitializationService.initializeZipEvents(events).pipe(
            tap((zipData) => {
              const nonDrivingEvents = zipData.zipEvents.filter((event) =>
                ["Off Duty", "On Duty", "Sleeper Berth"].includes(
                  event.statusName,
                ),
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
          ),
        ),
      );

    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {
      zipData$,
    };
    dialogConfig.position = {
      top: "50px",
    };

    return this.dialog
      .open(ZipDialogComponent, dialogConfig)
      .afterClosed()
      .pipe(
        tap(() =>
          this.taskQueueService.zipTasks.update((prev) => {
            const newValue = { ...prev };
            newValue[this.zipId] = {
              time: DateTime.now().toFormat("HH:mm"),
              isDone: false,
            };
            return newValue;
          }),
        ),
        switchMap((result) => (result ? of(result) : EMPTY)),
        // 2. Prepare resize items
        map((zipData: IZipInitializationData) => ({
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
          ),
        })),
        // 3. Conditional operation sequence (Resize -> Shift)
        switchMap(({ resizeItems, ...zipData }) => {
          const resize$ = this.zipResizeService.processResizeItems(
            tenant,
            resizeItems,
            this.resize(),
            this.fillStatus(),
          );

          if (this.resize() && this.shift()) {
            // Resize then Shift
            return resize$.pipe(
              mergeMap(() =>
                this.zipShiftService
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
                    this.preformSmartFix() ? this.engineOffIdleTimeSpawn() : 0,
                    this.shiftOriginalEventDuration(),
                  )
                  .pipe(toArray()),
              ),
            );
          } else if (this.resize()) {
            // Only Resize
            return resize$.pipe();
          } else if (this.shift()) {
            // Only Shift

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
                this.preformSmartFix() ? this.engineOffIdleTimeSpawn() : 0,
                this.shiftOriginalEventDuration(),
              )
              .pipe(toArray());
          } else {
            return of({});
          }
        }),
      )
      .pipe(
        switchMap(() => {
          if (this.preformSmartFix()) {
            return this.smartFixService.smartFix(tenant.id, driverId, date);
          } else return of({});
        }),
      )
      .subscribe({
        next: () => {
          this.monitorService.selectedEvents.set([]);
          this._snackBar.open("[ZIP] Completed", "OK", { duration: 3500 });
          this.monitorService.refreshDailyLogs();
          this.urlService.refreshWebApp();
        },
        error: (err) => {
          this.taskQueueService.zipTasks.update((prev) => {
            const newValue = { ...prev };
            newValue[this.zipId] = {
              ...newValue[this.zipId],
              isDone: null,
            };
            return newValue;
          });
          const message = err.error?.message
            ? `[ZIP] ERROR: ${err.error.message}`
            : `[ZIP] ERROR: ${err}`;
          this._snackBar.open(message, "Close", { duration: 7000 });
        },
        complete: () => {
          this.taskQueueService.zipTasks.update((prev) => {
            const newValue = { ...prev };
            newValue[this.zipId] = {
              ...newValue[this.zipId],
              isDone: true,
            };
            return newValue;
          });
          setTimeout(
            () =>
              this.taskQueueService.zipTasks.update((prev) => {
                const newValue = { ...prev };
                delete newValue[this.zipId];
                return newValue;
              }),
            5000,
          );
        },
      });
  }
}
