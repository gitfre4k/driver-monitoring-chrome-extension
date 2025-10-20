import { computed, inject, Injectable, signal, effect } from "@angular/core";
import { MonitorService } from "./monitor.service";

import { dutyStatusNames, getDuration, getTime } from "../helpers/zip.helpers";
import { ApiOperationsService } from "./api-operations.service";
import {
  map,
  mergeMap,
  of,
  switchMap,
  toArray,
  EMPTY,
  defaultIfEmpty,
} from "rxjs";
import { ITenant } from "../interfaces";
import { ApiService } from "./api.service";
import { UrlService } from "./url.service";
import { MatDialog } from "@angular/material/dialog";
import { ZipDialogComponent } from "../components/UI/zip-dialog/zip-dialog.component";
import { MatSnackBar } from "@angular/material/snack-bar";

import { ComputeEventsService } from "./compute-events.service";
import { ZipInitializationService } from "./zip-initialization.service";
import { ZipResizeService } from "./zip-resize.service";
import { ZipShiftService } from "./zip-shift.service";
import { IZipInitializationData } from "../interfaces/zip.interface";

@Injectable({
  providedIn: "root",
})
export class ZipService {
  monitorService = inject(MonitorService);
  apiService = inject(ApiService);
  apiOperationsService = inject(ApiOperationsService);
  urlService = inject(UrlService);
  computeEventsService = inject(ComputeEventsService);

  zipInitializationService = inject(ZipInitializationService);
  zipResizeService = inject(ZipResizeService);
  zipShiftService = inject(ZipShiftService);

  readonly dialog = inject(MatDialog);
  readonly _snackBar = inject(MatSnackBar);

  resize = signal(true);
  resizeSpeed = signal(64);
  maxSpeedDeviation = signal(`±4`);
  resizeMinDuration = signal(4);

  shift = signal(true);
  selectedDirection = signal(1);
  zippedOnDutyDuration = signal(18);
  shiftDirection = computed<"Past" | "Future">(() => {
    return this.selectedDirection() ? "Future" : "Past";
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
          if (event.pti === -9999) return acc + 0;
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

  zip(tenant: ITenant, driverId: number, date: string) {
    if (!tenant || !driverId || !date) {
      return this._snackBar.open("[ZIP] Error: Missing data", "OK", {
        duration: 7000,
      });
    }

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
          this.zipInitializationService.initializeZipEvents(events),
        ),
      );

    return this.dialog
      .open(ZipDialogComponent, {
        data: {
          zipData$,
        },
      })
      .afterClosed()
      .pipe(
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
            this.fill(),
            this.gapMinDuration(),
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
                  )
                  .pipe(toArray()),
              ),
            );
          } else if (this.resize()) {
            // Only Resize
            return resize$;
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
              )
              .pipe(toArray());
          } else {
            return of({});
          }
        }),
      )
      .subscribe({
        next: () => {
          this.monitorService.selectedEvents.set([]);
          this._snackBar.open("[ZIP] Completed", "OK", { duration: 3500 });
          this.monitorService.refreshDailyLogs();
        },
        error: (err) => {
          const message = err.error?.message
            ? `[ZIP] ERROR: ${err.error.message}`
            : `[ZIP] ERROR: ${err}`;
          this._snackBar.open(message, "Close", { duration: 7000 });
        },
      });
  }
}
