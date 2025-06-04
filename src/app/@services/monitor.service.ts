import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { ApiService } from './api.service';

import {
  IDailyLogs,
  IDriverDailyLogEvents,
  IEvent,
} from '../interfaces/driver-daily-log-events.interface';
import { UrlService } from './url.service';
import { ComputeEventsService } from './compute-events.service';
import { concatMap, of, tap, zip } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

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
  coDriverDailyLog = signal({
    events: [] as IEvent[],
  } as IDriverDailyLogEvents);

  dailyLogs = toSignal<IDailyLogs>(
    zip(
      [toObservable(this.driverDailyLog), toObservable(this.coDriverDailyLog)],
      (driverDailyLog, coDriverDailyLog) => {
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
      new Date(new Date(timestamp).setHours(24, 0, 0, 0))
    );

    this.apiService
      .getDriverDailyLogEvents(id, timestampWithOffSet, tenantId)
      .pipe(
        tap((driverDailyLog) => this.driverDailyLog.set(driverDailyLog)),
        concatMap((driverDailyLog) => {
          if (driverDailyLog.coDrivers && driverDailyLog.coDrivers[0]?.id) {
            const coId = driverDailyLog.coDrivers[0].id;
            const date = new Date(driverDailyLog.date);

            return this.apiService
              .getDriverDailyLogEvents(coId, date, tenantId)
              .pipe(
                tap((coDriverDailyLog) =>
                  this.coDriverDailyLog.set(coDriverDailyLog)
                )
              );
          } else
            return of({
              events: [] as IEvent[],
            } as IDriverDailyLogEvents as IDriverDailyLogEvents).pipe(
              tap((noLogs) => this.coDriverDailyLog.set(noLogs))
            );
        })
      )
      .subscribe();

    return;
  }
}
