import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { from, switchMap, tap } from 'rxjs';
import { IEventDetails, ITenant } from '../interfaces';
import { DateTime } from 'luxon';
import { IEvent } from '../interfaces/driver-daily-log-events.interface';

@Injectable({
  providedIn: 'root',
})
export class ApiOperationsService {
  private http: HttpClient = inject(HttpClient);

  ///////////////////
  // get Event
  getEvent(tenant: ITenant, eventId: number) {
    console.log('[API Service]: getEvent() called');
    return this.http.get<IEventDetails>(
      `https://app.monitoringdriver.com/api/Logs/GetEvent/${eventId}`,
      {
        withCredentials: true,
        headers: {
          'X-Tenant-Id': `${tenant.id}`,
          'x-client-timezone': `${DateTime.local().zoneName}`,
        },
      }
    );
  }

  //     "startTime": "2025-06-03T02:04:39Z",

  extendPTI = (tenant: ITenant, eventId: number, seconds: number) => {
    const url = 'https://app.monitoringdriver.com/api/Logs/UpdateEvent';

    const getRandom = (min: number, max: number) => {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const getStartTime = (date: string) =>
      DateTime.fromISO(date)
        .minus({ seconds })
        .minus({ seconds: getRandom(1, 180) }) // + random (1sec - 3min)
        .toUTC()
        .toISO();

    return this.getEvent(tenant, eventId).pipe(
      switchMap((event) => {
        return this.http.post<IEventDetails>(
          url,
          { ...event, startTime: getStartTime(event.startTime)! },
          {
            withCredentials: true,
            headers: {
              'X-Tenant-Id': `${tenant.id}`,
              'x-client-timezone': `${DateTime.local().zoneName}`,
            },
          }
        );
      })
    );
  };

  shift(
    tenant: ITenant,
    eventArray: IEvent[],
    direction: 'Past' | 'Future',
    time: string
  ) {
    const url = 'https://app.monitoringdriver.com/api/Logs/ShiftEvents';
    const body = {
      startEvent: eventArray[0],
      endEvent: eventArray[-1],
      direction,
      time, // '00:05'
      timeAsTimeSpan: `${new Date().getTime()}`,
    };

    return from(
      this.http.post(url, body, {
        withCredentials: true,
        headers: {
          'X-Tenant-Id': `${tenant.id}`,
          'x-client-timezone': `${DateTime.local().zoneName}`,
        },
      })
    );
  }
}
