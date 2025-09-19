import { inject, Injectable } from '@angular/core';
import { MonitorService } from './monitor.service';
import { DateTime, Duration } from 'luxon';
import { IEvent } from '../interfaces/driver-daily-log-events.interface';
import {
  getDuration,
  getRandomIntInclusive,
  getTime,
} from '../helpers/zip.helpers';
import { ApiOperationsService } from './api-operations.service';
import { concat, concatMap, from, mergeMap, switchMap, tap } from 'rxjs';
import { ITenant } from '../interfaces';
import { ApiService } from './api.service';
import { isDutyStatus } from '../helpers/app.helpers';

@Injectable({
  providedIn: 'root',
})
export class ZipService {
  monitorService = inject(MonitorService);
  apiService = inject(ApiService);
  apiOperationsService = inject(ApiOperationsService);

  zip() {
    const selectedEvents = this.monitorService.selectedEvents();
    const allEvents = this.monitorService.computedDailyLogEvents();

    if (!allEvents) return;

    const { 0: first, [selectedEvents.length - 1]: lastSelected } =
      selectedEvents.sort((a, b) => getTime(a) - getTime(b));
    const toZipEvents = allEvents.filter(
      (e) =>
        getTime(e) >= getTime(first) && getTime(e) <= getTime(lastSelected),
    );

    console.log('///////////////////////////');
    console.log('////// Z // I // P ////////');
    console.log('///////////////////////////');
    toZipEvents.forEach((e) => console.log(e.statusName));
    console.log('///////////////////////////');

    ////////////////////////////////////////////////////
    let tenant!: ITenant;
    let driverId!: number;
    let date!: string;
    ////////////////////////////////////////////////////
    const deleteEventInfo = { ids: [] } as {
      ids: number[];
    };
    const resizeEventInfo = [] as {
      event: IEvent;
      duration: string;
      durationDiffInSeconds: number;
    }[];
    const shiftLastSelEvIds: number[] = [];
    /////////////////////////////////////////////////////

    for (let i = 0; i < toZipEvents.length; i++) {
      const event = toZipEvents[i];
      if (toZipEvents[i].statusName === 'Driving') {
        const newSpeed = 65 + Math.random() * 4;
        const originalSpeed = event.averageSpeed * 10000;
        const originalDuration = event.durationInSeconds;
        const distance = originalSpeed * (originalDuration / 3600);
        const newDuratiom = ((distance / newSpeed) * 3600) / 10000;

        const duration = getDuration(newDuratiom);
        const durationDiffInSeconds = originalDuration - newDuratiom;

        resizeEventInfo.push({ event, duration, durationDiffInSeconds });
      }
      if (
        [
          'Engine On',
          'Engine Off',
          'Login',
          'Logout',
          'Diagnostic',
          'Diag. CLR',
        ].includes(toZipEvents[i].statusName)
      ) {
        deleteEventInfo.ids.push(event.id);
        event.tenant && (tenant = event.tenant);
        event.driver?.id && (driverId = event.driver.id);
        event.date && (date = event.date);
      }
      if (['On Duty', 'Sleeper Berth', 'Off Duty'].includes(event.statusName)) {
        shiftLastSelEvIds.push(event.id);
      }
    }

    ///////////////
    // delete obs
    const delete$ = this.apiOperationsService
      .deleteEvents(tenant, deleteEventInfo.ids)
      .pipe(tap((resData) => console.log('[ZIP] deleting events...', resData)));
    ///////////////
    // resize obs
    const resizeObs = resizeEventInfo.map((resInf) =>
      this.apiOperationsService
        .resizeEvent(tenant, resInf.event.id, {
          duration: resInf.duration,
          durationAsTimeSpan: `${new Date().getTime()}`,
        })
        .pipe(tap((resData) => console.log('[ZIP] resizing...', resData))),
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
                shiftLastSelEvIds.includes(e.id) &&
                e.id !== shiftLastSelEvIds[shiftLastSelEvIds.length - 1],
            ),
          ),
        ),
        concatMap((last) =>
          this.apiOperationsService
            .shift(tenant, [first, last], {
              direction: 'Future',
              time: getDuration(
                last.durationInSeconds > 900
                  ? last.durationInSeconds - 900 + getRandomIntInclusive(0, 300)
                  : last.durationInSeconds,
              ).slice(0, -3),
            })
            .pipe(tap((resData) => console.log('[ZIP] resizing...', resData))),
        ),
      );

    const zip$ = concat(delete$, resize$, shift$);

    return zip$.subscribe();
  }
}
