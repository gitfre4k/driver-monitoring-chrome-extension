import { inject, Injectable } from '@angular/core';
import { ITenant } from '../interfaces';
import { IZipInitializationData } from '../interfaces/zip.interface';
import { IEvent } from '../interfaces/driver-daily-log-events.interface';
import {
  concatMap,
  forkJoin,
  from,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  toArray,
} from 'rxjs';
import { ApiOperationsService } from './api-operations.service';
import { ApiService } from './api.service';
import { ComputeEventsService } from './compute-events.service';
import {
  dutyStatusNames,
  getDuration,
  getRandomIntInclusive,
  getTime,
} from '../helpers/zip.helpers';

@Injectable({
  providedIn: 'root',
})
export class ZipShiftService {
  apiService = inject(ApiService);
  apiOperationsService = inject(ApiOperationsService);
  computeEventsService = inject(ComputeEventsService);

  processShift(
    tenant: ITenant,
    driverId: number,
    date: string,
    dates: string[],
    initialData: IZipInitializationData,
    shift: boolean,
    shiftDirection: 'Future' | 'Past',
    zippedOnDutyDuration: number,
    shiftMinTimeFrame: number,
    shiftBreak: boolean,
    engineOffIdleTimeSpawn: number,
    shiftOriginalEventDuration: { [id: number]: number },
    onProgress?: (done: number, total: number) => void,
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
    // Re-fetch the days the shift range spans. A multi-day selection must pull
    // EVERY selected day and rebuild via the multi-day engine — otherwise the
    // in-range events on days other than `date` are silently dropped from the
    // shift step. Single-day keeps the original per-day compute (main-driver
    // only, matching the pre-multi-day behaviour).
    const refetchedEvents$: Observable<IEvent[]> =
      dates.length > 1
        ? forkJoin(
            dates.map((d) =>
              this.apiService.getDriverDailyLogEvents(driverId, d, tenant.id),
            ),
          ).pipe(
            map((ddles) =>
              this.computeEventsService.getComputedEventsMultiDay(
                ddles.map((ddle) => ({
                  driverDailyLog: ddle,
                  coDriverDailyLog: null,
                })),
              ),
            ),
          )
        : this.apiService
            .getDriverDailyLogEvents(driverId, date, tenant.id)
            .pipe(
              map((ddle) =>
                this.computeEventsService.getComputedEvents({
                  driverDailyLog: ddle,
                  coDriverDailyLog: null,
                }),
              ),
            );

    const getUpdatedEvents$ = refetchedEvents$.pipe(
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
        const reverse = direction === 'Past';
        const sortedEvents = reverse ? events.slice().reverse() : events;

        // 30-minute break logic
        let accumulatedDrivingDuration = 0;
        const breakEvent = events.find((event) => {
          if (event.statusName === 'Driving') {
            accumulatedDrivingDuration += event.durationInSeconds;
          }
          return accumulatedDrivingDuration > 28800;
        });
        const breakIndex = sortedEvents.findIndex(
          (event) => event.id === breakEvent?.id,
        );
        // end 30-minute break logic

        if (sortedEvents.length < 2) return of({});

        // remove first event if previous was Driving and add next duty status event in case last one is driving
        reverse
          ? sortedEvents[sortedEvents.length - 1].statusName === 'Driving'
          : sortedEvents[0].occurredAfterDriving && sortedEvents.shift();

        const firstShiftEvent = sortedEvents[0];
        const lastShiftEvent = sortedEvents[sortedEvents.length - 1];
        const minDutyDuration = zippedOnDutyDuration * 60;

        return from(sortedEvents).pipe(
          concatMap((event, index) => {
            onProgress?.(index + 1, sortedEvents.length);

            const shiftId = reverse ? index + 1 : index;

            if (shiftId >= sortedEvents.length) return of({});

            const currentShiftEvent = sortedEvents[shiftId];
            const prevEventForShift = sortedEvents[index];

            // Shift exceptions
            if (
              currentShiftEvent.statusName === 'Driving' ||
              currentShiftEvent.id === lastShiftEvent.id ||
              currentShiftEvent.pti === -9999
            ) {
              return of({});
            }

            // 30-minute break special shift logic
            if (
              shiftBreak &&
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
              if (timeToShift <= 0 || timeToShift < shiftMinTimeFrame)
                return of({});
              // Jitter only ever ADDS so the zipped break always ends >= 30:00.
              // (Previously it subtracted for the Past direction, producing a
              // sub-30-minute break.)
              const time = getDuration(
                timeToShift + getRandomIntInclusive(1, 180),
              ).slice(0, -3);

              return this.apiOperationsService.shift(
                tenant,
                [firstShiftEvent, prevEventForShift],
                {
                  direction: direction === 'Past' ? 'Future' : 'Past',
                  time,
                },
              );
            }

            // general shift logic
            const originalDuration =
              currentShiftEvent.durationInSeconds -
              shiftOriginalEventDuration[currentShiftEvent.id];

            const timeToShift =
              currentShiftEvent.durationInSeconds -
              minDutyDuration -
              getRandomIntInclusive(1, 300);

            if (timeToShift > 0) {
              const time = getDuration(
                Math.max(timeToShift, originalDuration),
              ).slice(0, -3);
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

    const addEngines$ = getUpdatedEvents$.pipe(
      switchMap((events) => {
        if (!engineOffIdleTimeSpawn) {
          return of({});
        } else
          return from(events).pipe(
            mergeMap((event, index) => {
              if (
                event.statusName === 'Driving' &&
                events[index + 1] &&
                events[index + 1].durationInSeconds >
                  engineOffIdleTimeSpawn * 60
              ) {
                return this.apiOperationsService.addEngineOff(
                  tenant,
                  events[index + 1].id,
                );
              } else return of({});
            }),
            toArray(),
          );
      }),
    );

    return delete$.pipe(
      switchMap(() => shiftLogic$),
      toArray(),
      switchMap(() => addEngines$),
    );
  }
}
