import { inject, Injectable } from "@angular/core";
import { ITenant } from "../interfaces";
import { IZipInitializationData } from "../interfaces/zip.interface";
import { concatMap, from, map, Observable, of, switchMap, toArray } from "rxjs";
import { ApiOperationsService } from "./api-operations.service";
import { ApiService } from "./api.service";
import { ComputeEventsService } from "./compute-events.service";
import {
  dutyStatusNames,
  getDuration,
  getRandomIntInclusive,
  getTime,
} from "../helpers/zip.helpers";

@Injectable({
  providedIn: "root",
})
export class ZipShiftService {
  apiService = inject(ApiService);
  apiOperationsService = inject(ApiOperationsService);
  computeEventsService = inject(ComputeEventsService);

  processShift(
    tenant: ITenant,
    driverId: number,
    date: string,
    initialData: IZipInitializationData,
    shift: boolean,
    shiftDirection: "Future" | "Past",
    zippedOnDutyDuration: number,
  ): Observable<any> {
    if (!shift) {
      return of({});
    }

    // 1. Delete events
    const idsToDelete = initialData.eventsToDelete.map((event) => event.id);
    const delete$ = idsToDelete.length
      ? this.apiOperationsService.deleteEvents(tenant, idsToDelete)
      : of({});

    // 2. update and filter events
    const getUpdatedEvents$ = this.apiService
      .getDriverDailyLogEvents(driverId, date, tenant.id)
      .pipe(
        switchMap((ddle: any) =>
          this.computeEventsService.getComputedEvents({
            driverDailyLog: ddle,
            coDriverDailyLog: null,
          }),
        ),
        toArray(),
        map((events) =>
          events.filter((event) => {
            const eventTime = getTime(event);
            return (
              eventTime >= initialData.startTime &&
              eventTime <= initialData.endTime &&
              dutyStatusNames.has(event.statusName)
            );
          }),
        ),
      );

    // 3. Perform shift
    const shiftLogic$ = getUpdatedEvents$.pipe(
      switchMap((events) => {
        const direction = shiftDirection;
        const reverse = direction === "Past";
        const sortedEvents = reverse ? events.slice().reverse() : events;

        // 30-minute break logic
        let accumulatedDrivingDuration = 0;
        const breakEvent = events.find((event) => {
          if (event.statusName === "Driving") {
            accumulatedDrivingDuration += event.durationInSeconds;
          }
          return accumulatedDrivingDuration > 28800;
        });
        const breakIndex = sortedEvents.findIndex(
          (event) => event.id === breakEvent?.id,
        );
        // end 30-minute break logic

        if (sortedEvents.length === 0) return of({});

        const firstShiftEvent = sortedEvents[0];
        const lastShiftEvent = sortedEvents[sortedEvents.length - 1];
        const minDutyDuration = zippedOnDutyDuration * 60;

        return from(sortedEvents).pipe(
          concatMap((event, index) => {
            const shiftId = reverse ? index + 1 : index;

            if (shiftId >= sortedEvents.length) return of({});

            const currentShiftEvent = sortedEvents[shiftId];
            const prevEventForShift = sortedEvents[index];

            // Shift exceptions
            if (
              currentShiftEvent.statusName === "Driving" ||
              currentShiftEvent.id === lastShiftEvent.id ||
              currentShiftEvent.pti === -9999
            ) {
              return of({});
            }

            // 30-minute break special shift logic
            if (
              breakIndex !== -1 &&
              index === (reverse ? breakIndex : breakIndex - 1)
            ) {
              const breakDuration = currentShiftEvent.durationInSeconds;

              if (breakDuration >= 1800) {
                if (breakDuration > 1980) {
                  const time = getDuration(
                    breakDuration - 1800 - getRandomIntInclusive(1, 180),
                  ).slice(0, -3);
                  return this.apiOperationsService.shift(
                    tenant,
                    [firstShiftEvent, prevEventForShift],
                    { direction, time },
                  );
                }
                return of({});
              }

              const timeToShift = 1800 - breakDuration;
              if (timeToShift <= 0) return of({});
              const time = getDuration(
                timeToShift + getRandomIntInclusive(1, 180),
              ).slice(0, -3);

              return this.apiOperationsService.shift(
                tenant,
                [firstShiftEvent, prevEventForShift],
                {
                  direction: direction === "Past" ? "Future" : "Past",
                  time,
                },
              );
            }

            // general shift logic
            const timeToShift =
              currentShiftEvent.durationInSeconds -
              minDutyDuration -
              getRandomIntInclusive(1, 300);

            if (timeToShift > 0) {
              const time = getDuration(timeToShift).slice(0, -3);
              return this.apiOperationsService.shift(
                tenant,
                [firstShiftEvent, prevEventForShift],
                { direction, time },
              );
            }
            return of({});
          }),
        );
      }),
    );

    return delete$.pipe(switchMap(() => shiftLogic$));
  }
}
