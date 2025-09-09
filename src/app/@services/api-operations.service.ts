import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { from, map, mergeMap, switchMap, tap } from 'rxjs';
import { IEventDetails, ITenant } from '../interfaces';
import { DateTime } from 'luxon';
import { IEvent } from '../interfaces/driver-daily-log-events.interface';
import { TEventTypeCode } from '../types';
import {
  IAdvancedResizePayload,
  IResizePayload,
  IShiftInputState,
} from '../interfaces/api.interface';
import { ApiService } from './api.service';
import { ComputeEventsService } from './compute-events.service';

@Injectable({ providedIn: 'root' })
export class ApiOperationsService {
  private http: HttpClient = inject(HttpClient);
  private apiService = inject(ApiService);
  private computeEventsService = inject(ComputeEventsService);

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
      },
    );
  }

  partiallyTransformOnDuty = (
    tenant: ITenant,
    event: IEvent,
    typeCode:
      | 'ChangeToOffDutyStatus'
      | 'ChangeToSleeperBerthStatus'
      | 'ChangeToOnDutyNotDrivingStatus',
  ) => {
    const url = 'https://app.monitoringdriver.com/api/Logs/CreateEvent';

    const getStartTime = (date: string) => {
      if (typeCode === 'ChangeToOnDutyNotDrivingStatus') {
        return DateTime.fromISO(date)
          .plus({ seconds: event.realDurationInSeconds })
          .minus({ minutes: 15 })
          .minus({ seconds: this.getRandom(1, 180) })
          .minus({ millisecond: this.getRandom(1, 1000) })
          .toUTC()
          .toISO() as string;
      }

      return DateTime.fromISO(date)
        .plus({ minutes: 15 })
        .plus({ seconds: this.getRandom(1, 180) })
        .plus({ millisecond: this.getRandom(1, 1000) })
        .toUTC()
        .toISO() as string;
    };

    return this.getEvent(tenant, event.id).pipe(
      switchMap((eventDetails) => {
        const { note, id, eventUuid, ...body } = eventDetails;
        body.startTime = getStartTime(body.startTime);
        body.eventTypeCode = typeCode;

        return this.http.post<IEventDetails>(url, body, {
          withCredentials: true,
          headers: {
            'X-Tenant-Id': `${tenant.id}`,
            'x-client-timezone': `${DateTime.local().zoneName}`,
          },
        });
      }),
    );
  };

  advancedResize(
    tenant: ITenant,
    event: IEvent,
    payload: IAdvancedResizePayload,
  ) {
    const coefficient =
      payload.parsedErrorInfo.comparison === 'smaller' ? -1 : 1;
    const mileageDifference = payload.parsedErrorInfo.miles;
    const originalOdometer = event.nextDutyStatusInfo.totalVehicleMiles;
    const fixDistance = coefficient * mileageDifference + -coefficient * 14; // diff + 15mi tolerance
    const newOdometer = originalOdometer + fixDistance;

    return this.updateEvent(tenant, event.nextDutyStatusInfo.id, {
      totalVehicleMiles: newOdometer,
    }).pipe(
      switchMap(() =>
        this.resizeEvent(tenant, event.id, payload.resizePayload).pipe(
          switchMap(() =>
            this.updateEvent(tenant, event.nextDutyStatusInfo.id, {
              totalVehicleMiles: originalOdometer,
            }),
          ),
          switchMap(() =>
            this.apiService.getDriverDailyLogEvents(
              event.driver.id,
              event.date,
              tenant.id,
            ),
          ),
          map((driverDailyLog) =>
            this.computeEventsService.getComputedEvents({
              driverDailyLog,
              coDriverDailyLog: null,
            }),
          ),
          switchMap((events) => events.filter((e) => e.id === event.id)),
          switchMap((ev) => {
            const intermediates = ev.intermediatesInfo.sort(
              (a, b) => a.totalVehicleMiles - b.totalVehicleMiles,
            );
            for (let i = 0; i < intermediates.length; i++) {
              const accumulatedMiles =
                Math.floor(ev.averageSpeed * (i + 1)) +
                (intermediates.length - i) +
                (i % 2 === 0 ? -1 : 1);
              intermediates[i].totalVehicleMiles =
                ev.odometer + accumulatedMiles;
              intermediates[i].accumulatedVehicleMiles =
                ev.accumulatedVehicleMiles + accumulatedMiles;
            }

            return from(ev.intermediatesInfo).pipe(
              mergeMap((inter) =>
                this.updateEvent(tenant, inter.id, {
                  totalVehicleMiles: inter.totalVehicleMiles,
                  accumulatedVehicleMiles: inter.accumulatedVehicleMiles,
                }),
              ),
            );
          }),
        ),
      ),
    );
  }

  resizeEvent(tenant: ITenant, eventId: number, payload: IResizePayload) {
    const url = 'https://app.monitoringdriver.com/api/Logs/ResizeEvent';
    const body = { eventId, ...payload };

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
    payload: Partial<IEventDetails>,
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
      }),
    );
  }

  updateEventTypeCode(
    tenant: ITenant,
    eventId: number,
    eventTypeCode: TEventTypeCode,
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
      }),
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
      }),
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
      }, 10),
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
        body.note = 'pti';
        body.startTime = getStartTime(eventDetails.startTime);

        return this.http.post<IEventDetails>(url, body, {
          withCredentials: true,
          headers: {
            'X-Tenant-Id': `${tenant.id}`,
            'x-client-timezone': `${DateTime.local().zoneName}`,
          },
        });
      }),
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
      }),
    );
  };

  shift(tenant: ITenant, eventArray: IEvent[], payload: IShiftInputState) {
    const { direction, time } = payload;
    const url = 'https://app.monitoringdriver.com/api/Logs/ShiftEvents';
    const getEventStartTime = (date: IEvent) =>
      new Date(
        date.realStartTime ? date.realStartTime : date.startTime,
      ).getTime();
    const events = eventArray.sort(
      (a, b) => getEventStartTime(a) - getEventStartTime(b),
    );

    const body = {
      startEvent: events[0].id,
      endEvent: events[events.length - 1].id,
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
      }),
    );
  }
}
