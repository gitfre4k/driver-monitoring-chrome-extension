import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { ApiService } from './api.service';

import {
  IDailyLogs,
  IDriverDailyLogEvents,
  IEvent,
} from '../interfaces/driver-daily-log-events.interface';
import { UrlService } from './url.service';
import { ComputeEventsService } from './compute-events.service';
import { tap } from 'rxjs';

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

  driverDailyLog = signal<null | IDriverDailyLogEvents>(null);
  computedDailyLogEvents = signal<null | IEvent[]>(null);
  isUpdating = signal(false);

  constructor() {}

  updateDriverDailyLogEvents(url: string, tenantId: string): void {
    this.isUpdating.set(true);

    const parts = url.split('/');
    const logs = parts[3];
    const id = +parts[4];
    const timestamp = parts[5];

    if (logs !== 'logs' || id === undefined || timestamp === undefined) {
      this.driverDailyLog.set(null);
      this.isUpdating.set(false);
      return;
    }
    // //////////////////////////////////////////////////
    // /////////////////////  suka   ////////////////////
    // //////////////////////////////////////////////////
    const timestampWithOffSet = new Date(
      new Date(new Date(timestamp).setHours(24, 0, 0, 0))
    );
    // //////////////////////////////////////////////////
    // /////////////////////  suka   ////////////////////
    // //////////////////////////////////////////////////

    this.apiService
      .getDriverDailyLogEvents(id, timestampWithOffSet, tenantId)
      .pipe(
        tap((driverDailyLog) => {
          this.driverDailyLog.set(driverDailyLog);

          if (driverDailyLog.coDrivers && driverDailyLog.coDrivers[0]?.id) {
            const coId = driverDailyLog.coDrivers[0].id;
            this.apiService
              .getDriverDailyLogEvents(coId, timestampWithOffSet, tenantId)
              .subscribe({
                next: (coDriverDailyLog) =>
                  this.handleDriverDailyLogEvents({
                    driverDailyLog,
                    coDriverDailyLog,
                  }),
              });
          } else
            this.handleDriverDailyLogEvents({
              driverDailyLog,
              coDriverDailyLog: null,
            });
        })
      )
      .subscribe();

    return;
  }

  handleDriverDailyLogEvents({ driverDailyLog, coDriverDailyLog }: IDailyLogs) {
    this.isUpdating.set(false);
    if (!driverDailyLog) {
      console.log('No driver daily log found', driverDailyLog);
      return this.computedDailyLogEvents.set(null);
    } else
      return this.computedDailyLogEvents.set(
        this.computeEventsService.getComputedEvents({
          driverDailyLog,
          coDriverDailyLog,
        })
      );
  }
}
