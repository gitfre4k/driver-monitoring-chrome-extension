import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { ApiService } from './api.service';

import {
  IDriverDailyLogEvents,
  IEvent,
} from '../interfaces/driver-daily-log-events.interface';
import { UrlService } from './url.service';
import { ComputeEventsService } from './compute-events.service';
import { map, tap, zip } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { bindEventViewId } from '../helpers/monitor.helpers';

@Injectable({
  providedIn: 'root',
})
export class MonitorService {
  private apiService = inject(ApiService);
  private urlService = inject(UrlService);
  private computeEventsService = inject(ComputeEventsService);

  refresh = signal(0);

  updateEvents = effect(() => {
    const url = this.urlService.url();
    const tenant = this.urlService.tenant();
    if (!url || !tenant) return;
    if (this.refresh()) console.log('live monitor page refreshed');

    this.updateDriverDailyLogEvents(url, tenant.id);
  });

  driverDailyLog = signal({} as IDriverDailyLogEvents);
  coDriverDailyLog = signal({} as IDriverDailyLogEvents);
  dailyLogs = toSignal(
    zip(
      [toObservable(this.driverDailyLog), toObservable(this.coDriverDailyLog)],
      (
        driverDailyLog: IDriverDailyLogEvents,
        coDriverDailyLog: IDriverDailyLogEvents
      ) => {
        return { driverDailyLog, coDriverDailyLog };
      }
    )
  );

  events = computed(() => {
    const dailyLogs = this.dailyLogs();
    if (!dailyLogs) return [] as IEvent[];
    return this.computeEventsService.getComputedEvents(dailyLogs);
  });

  constructor() {}

  updateDriverDailyLogEvents(url: string, tenantId: string): void {
    const parts = url.split('/');
    const logs = parts[3];
    const id = +parts[4];
    const timestamp = parts[5];

    if (logs !== 'logs' || id === undefined || timestamp === undefined) {
      this.driverDailyLog.set({} as IDriverDailyLogEvents);
      return;
    }

    const timestampWithOffSet = new Date(
      new Date(new Date(timestamp).setHours(19, 0, 0, 0))
    );

    this.apiService
      .getDriverDailyLogEvents(id, timestampWithOffSet, tenantId)
      .pipe(
        tap((driverDailyLog) => {
          if (driverDailyLog.coDrivers && driverDailyLog.coDrivers[0]?.id) {
            const coId = driverDailyLog.coDrivers[0].id;
            const date = new Date(driverDailyLog.date);

            this.apiService
              .getDriverDailyLogEvents(coId, date, tenantId)
              .subscribe({
                next: (dailyLog) => this.coDriverDailyLog.set(dailyLog),
              });
          } else this.coDriverDailyLog.set({} as IDriverDailyLogEvents);
        })
      )
      .subscribe({
        next: (dailyLog) => this.driverDailyLog.set(dailyLog),
      });

    return;
  }
}
