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

  /** HOS rest bands (ascending seconds) a break block may satisfy. A block is
   *  clamped to the highest band it clears so zipping never shrinks a qualifying
   *  rest below the threshold it earns. */
  private static readonly BREAK_THRESHOLDS = [2, 3, 7, 8, 10, 34].map(
    (h) => h * 3600,
  );

  /**
   * Build per-event compression caps for protected break blocks.
   *
   * A break block is a maximal run of consecutive Off Duty + Sleeper Berth
   * events (scanned in shift order). For each block:
   *  - `T` = highest threshold the block total clears; unprotected if none.
   *  - `target` = T + random(0–15min); `budget` = blockTotal − target is the
   *    total seconds the block may be compressed.
   *  - The leading-edge event (first in scan order) is never a compression
   *    target (cap 0) so the block's boundary with the working period holds.
   *  - The remaining budget is consumed Off Duty first, then Sleeper Berth
   *    (prefer eating into off-duty), each event floored at `minDutyDuration`.
   *
   * Returns a map of block-event id → max compressible seconds. Events absent
   * from the map are not block-protected and follow the general shift logic.
   */
  private buildBreakBlockCaps(
    sortedEvents: IEvent[],
    minDutyDuration: number,
  ): Map<number, number> {
    const caps = new Map<number, number>();
    const isBreak = (e: IEvent) =>
      e.statusName === 'Off Duty' || e.statusName === 'Sleeper Berth';

    let i = 0;
    while (i < sortedEvents.length) {
      if (!isBreak(sortedEvents[i])) {
        i++;
        continue;
      }

      // Collect the maximal consecutive Off Duty + Sleeper Berth run.
      let j = i;
      while (j < sortedEvents.length && isBreak(sortedEvents[j])) j++;
      const block = sortedEvents.slice(i, j); // block[0] = leading edge
      i = j;

      const blockTotal = block.reduce((s, e) => s + e.durationInSeconds, 0);

      let threshold = 0;
      for (const t of ZipShiftService.BREAK_THRESHOLDS) {
        if (blockTotal >= t) threshold = t;
      }
      if (threshold === 0) continue; // clears nothing → not protected

      const target = threshold + getRandomIntInclusive(0, 900);
      let budget = Math.max(0, blockTotal - target);

      // Leading edge is protected outright.
      caps.set(block[0].id, 0);

      // Distribute the budget: Off Duty before Sleeper Berth (eat into off-duty
      // first, preserve sleeper).
      const rest = block.slice(1);
      const order = [
        ...rest.filter((e) => e.statusName === 'Off Duty'),
        ...rest.filter((e) => e.statusName === 'Sleeper Berth'),
      ];
      for (const e of order) {
        const removable = Math.max(0, e.durationInSeconds - minDutyDuration);
        const take = Math.min(budget, removable);
        caps.set(e.id, take);
        budget -= take;
      }
    }

    return caps;
  }

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

        // Protected break blocks: a run of consecutive Off Duty + Sleeper Berth
        // events represents an HOS rest period. Compressing it below the rest
        // band it satisfies would fabricate a violation, so each block is capped
        // at the highest threshold it cleared (+ small jitter). `breakBlockCaps`
        // maps a block event's id to the MAX seconds it may be compressed; a cap
        // of 0 means "do not compress" (leading edge, or budget exhausted).
        const breakBlockCaps = this.buildBreakBlockCaps(
          sortedEvents,
          minDutyDuration,
        );

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

            // Protected break block: takes precedence over the general and
            // 30-min-break branches so a multi-hour rest is never crushed below
            // the band it cleared. `cap` is the max compression allowed for this
            // event; 0 (or leading edge) means leave it untouched.
            const blockCap = breakBlockCaps.get(currentShiftEvent.id);
            if (blockCap !== undefined) {
              if (blockCap <= 0) return of({});
              const time = getDuration(blockCap).slice(0, -3);
              if (!time || time === '00:00') return of({});
              return this.apiOperationsService.shift(
                tenant,
                [firstShiftEvent, prevEventForShift],
                { direction, time },
              );
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
