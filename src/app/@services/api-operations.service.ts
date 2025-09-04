import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { from, mergeMap, switchMap } from 'rxjs';
import { IEventDetails, ITenant } from '../interfaces';
import { DateTime } from 'luxon';
import { IEvent } from '../interfaces/driver-daily-log-events.interface';
import { TEventTypeCode } from '../types';
import { IParsedErrorInfo, IResizePayload } from '../interfaces/api.interface';

@Injectable({
  providedIn: 'root',
})
export class ApiOperationsService {
  private http: HttpClient = inject(HttpClient);

  constructor() {}

  getRandom = (min: number, max: number) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

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

  advancedResize(tenant: ITenant, event: IEvent, payload: IParsedErrorInfo) {
    // this.getEvent()
  }

  resizeEvent(tenant: ITenant, eventId: number, payload: IResizePayload) {
    const url = 'https://app.monitoringdriver.com/api/Logs/ResizeEvent';
    const body = {
      eventId,
      ...payload,
    };

    return this.http.post(url, body, {
      withCredentials: true,
      headers: {
        'X-Tenant-Id': `${tenant.id}`,
        'x-client-timezone': `${DateTime.local().zoneName}`,
      },
    });
  }

  updateEvent(
    tenant: ITenant,
    eventId: number,
    payload: Partial<IEventDetails>
  ) {
    const url = 'https://app.monitoringdriver.com/api/Logs/UpdateEvent';

    return this.getEvent(tenant, eventId).pipe(
      switchMap((eventDetails) => {
        const body = { ...eventDetails, ...payload };

        return this.http.post<IEventDetails>(url, body, {
          withCredentials: true,
          headers: {
            'X-Tenant-Id': `${tenant.id}`,
            'x-client-timezone': `${DateTime.local().zoneName}`,
          },
        });
      })
    );
  }

  updateEventTypeCode(
    tenant: ITenant,
    eventId: number,
    eventTypeCode: TEventTypeCode
  ) {
    const url = 'https://app.monitoringdriver.com/api/Logs/UpdateEvent';

    return this.getEvent(tenant, eventId).pipe(
      switchMap((eventDetails) => {
        const { ...body } = eventDetails;
        body.eventTypeCode = eventTypeCode;

        return this.http.post<IEventDetails>(url, body, {
          withCredentials: true,
          headers: {
            'X-Tenant-Id': `${tenant.id}`,
            'x-client-timezone': `${DateTime.local().zoneName}`,
          },
        });
      })
    );
  }

  addEngineOff = (tenant: ITenant, eventId: number) => {
    const url = 'https://app.monitoringdriver.com/api/Logs/CreateEvent';

    const getStartTime = (date: string) =>
      DateTime.fromISO(date)
        .plus({ seconds: this.getRandom(1, 60) })
        .plus({ millisecond: this.getRandom(1, 1000) })
        .toUTC()
        .toISO() as string;

    return this.getEvent(tenant, eventId).pipe(
      switchMap((eventDetails) => {
        const { note, id, eventUuid, ...body } = eventDetails;
        body.startTime = getStartTime(body.startTime);
        body.eventTypeCode = 'EngineShutDownConventionalLocationPrecision';

        return this.http.post<IEventDetails>(url, body, {
          withCredentials: true,
          headers: {
            'X-Tenant-Id': `${tenant.id}`,
            'x-client-timezone': `${DateTime.local().zoneName}`,
          },
        });
      })
    );
  };

  deleteEvents = (tenant: ITenant, ids: number[]) => {
    const url = 'https://app.monitoringdriver.com/api/Logs/DeleteEvents';

    const idsChunks: number[][] = [];
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      idsChunks.push(chunk);
    }

    return from(idsChunks).pipe(
      mergeMap((ids) => {
        const body = { ids };
        return this.http.post(url, body, {
          withCredentials: true,
          headers: {
            'X-Tenant-Id': `${tenant.id}`,
            'x-client-timezone': `${DateTime.local().zoneName}`,
          },
        });
      }, 10)
    );
  };

  addPTI = (tenant: ITenant, eventId: number) => {
    const url = 'https://app.monitoringdriver.com/api/Logs/CreateEvent';

    const getStartTime = (date: string) =>
      DateTime.fromISO(date)
        .minus({ minutes: 15 })
        .minus({ seconds: this.getRandom(1, 180) })
        .minus({ millisecond: this.getRandom(1, 1000) })
        .toUTC()
        .toISO() as string;

    return this.getEvent(tenant, eventId).pipe(
      switchMap((eventDetails) => {
        const { id, eventUuid, ...body } = eventDetails;
        body.eventTypeCode = 'ChangeToOnDutyNotDrivingStatus';
        body.note = 'Pre-Trip Inspection';
        body.startTime = getStartTime(eventDetails.startTime);

        return this.http.post<IEventDetails>(url, body, {
          withCredentials: true,
          headers: {
            'X-Tenant-Id': `${tenant.id}`,
            'x-client-timezone': `${DateTime.local().zoneName}`,
          },
        });
      })
    );
  };

  extendPTI = (tenant: ITenant, eventId: number, seconds: number) => {
    const url = 'https://app.monitoringdriver.com/api/Logs/UpdateEvent';

    const getStartTime = (date: string) =>
      DateTime.fromISO(date)
        .minus({ seconds })
        .minus({ seconds: this.getRandom(1, 180) }) // + random (1sec - 3min)
        .minus({ millisecond: this.getRandom(1, 999) })
        .toUTC()
        .toISO();

    return this.getEvent(tenant, eventId).pipe(
      switchMap((eventDetails) => {
        const { ...body } = eventDetails;
        body.startTime = getStartTime(body.startTime)!;
        return this.http.post<IEventDetails>(url, body, {
          withCredentials: true,
          headers: {
            'X-Tenant-Id': `${tenant.id}`,
            'x-client-timezone': `${DateTime.local().zoneName}`,
          },
        });
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
