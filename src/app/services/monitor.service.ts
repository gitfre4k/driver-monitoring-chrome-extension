import { Injectable, inject, computed, signal, effect } from '@angular/core';
import { ApiService } from './api.service';
import {
  bindEventViewId,
  filterEvents,
  computeEvents,
  detectAndBindTeleport,
} from '../helpers/monitor.helpers';

import {
  IDriverDailyLogEvents,
  IEvent,
} from '../interfaces/driver-daily-log-events.interface';
import { UrlService } from './url.service';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MonitorService {
  private apiService = inject(ApiService);
  private urlService = inject(UrlService);

  refresh = signal(0);

  driverDailyLogEvents = signal({
    events: [] as IEvent[],
  } as IDriverDailyLogEvents);
  coDriverDailyLogEvents = signal({
    events: [] as IEvent[],
  } as IDriverDailyLogEvents);

  events = computed(() => {
    const driverEvents = this.driverDailyLogEvents().events;
    const coDriverEvents = this.coDriverDailyLogEvents().events;
    bindEventViewId(driverEvents);
    bindEventViewId(coDriverEvents);

    let events = [] as IEvent[];

    if (coDriverEvents.length > 0) {
      driverEvents.forEach(
        (e) =>
          (e.driver = {
            id: this.driverDailyLogEvents().driverId,
            name: this.driverDailyLogEvents().driverFullName,
          })
      );
      coDriverEvents.forEach(
        (e) =>
          (e.driver = {
            id: this.coDriverDailyLogEvents().driverId,
            name: this.coDriverDailyLogEvents().driverFullName,
          })
      );
      events = [...driverEvents, ...coDriverEvents].sort(
        (a, b) =>
          new Date(a.realStartTime).getTime() -
          new Date(b.realStartTime).getTime()
      );
    } else {
      events = [...driverEvents];
    }

    events = events.filter((event) => filterEvents(event));
    events = computeEvents(events);
    events = detectAndBindTeleport(events);

    return events;
  });

  updateDriverDailyLogEventsEffect = effect(() => {
    const url = this.urlService.url();
    const tenant = this.urlService.tenant();
    if (!url || !tenant) return;
    if (this.refresh()) console.log('live monitor page refreshed');

    this.updateDriverDailyLogEvents(url, tenant.id);
  });

  constructor() {}

  updateDriverDailyLogEvents(url: string, tenantId: string): void {
    const parts = url.split('/');
    const logs = parts[3];
    const id = +parts[4];
    const timestamp = parts[5];

    if (logs !== 'logs' || id === undefined || timestamp === undefined) {
      this.driverDailyLogEvents.set({} as IDriverDailyLogEvents);
      return;
    }

    console.log('// updateDriverDailyLogEvents -> subscribe');
    console.log(timestamp);

    const timestampWithOffSet = new Date(
      new Date(new Date(timestamp).setHours(19, 0, 0, 0))
    );

    this.apiService
      .getDriverDailyLogEvents(id, timestampWithOffSet, tenantId)
      .pipe(
        tap((x) => {
          if (x.coDrivers[0] && x.coDrivers[0].id) {
            this.apiService
              .getDriverDailyLogEvents(
                x.coDrivers[0].id,
                timestampWithOffSet,
                tenantId
              )
              .subscribe({
                next: (ddle) => this.coDriverDailyLogEvents.set(ddle),
              });
          } else {
            this.coDriverDailyLogEvents.set({
              events: [] as IEvent[],
            } as IDriverDailyLogEvents);
          }
        })
      )
      .subscribe({
        next: (ddle) => this.driverDailyLogEvents.set(ddle),
      });

    return;
  }
}
