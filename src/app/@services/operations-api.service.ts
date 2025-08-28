import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { IEventDetails, ITenant } from '../interfaces';
import { DateTime } from 'luxon';
import { IEvent } from '../interfaces/driver-daily-log-events.interface';

@Injectable({
  providedIn: 'root',
})
export class OperationsApiService {
  private http: HttpClient = inject(HttpClient);

  ///////////////////
  // get Event (not used)
  getEvent(id: number) {
    console.log('[API Service]: getEvent() called');
    return this.http.get<IEventDetails>(
      `https://app.monitoringdriver.com/api/Logs/GetEvent/${id}`,
      { withCredentials: true }
    );
  }

  //     "startTime": "2025-06-03T02:04:39Z",

  updateEvent = (tenant: ITenant, id: number, minutes: number) => {
    const url = 'https://app.monitoringdriver.com/api/Logs/UpdateEvent';

    const getRandom = (min: number, max: number) => {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const getStartTime = (date: string) =>
      DateTime.fromISO(date)
        .minus({ minutes })
        .minus({ seconds: getRandom(1, 180) })
        .toUTC()
        .toISO();

    return this.getEvent(id).pipe(
      switchMap((event) =>
        this.http.post<IEventDetails>(
          url,
          { ...event, startTime: getStartTime(event.startTime) },
          {
            withCredentials: true,
            headers: {
              'X-Tenant-Id': `${tenant.id}`,
              'x-client-timezone': `${DateTime.local().zoneName}`,
            },
          }
        )
      )
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
