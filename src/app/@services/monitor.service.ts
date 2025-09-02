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
import { DateTime } from 'luxon';
import { AppService } from './app.service';

@Injectable({
  providedIn: 'root',
})
export class MonitorService {
  private apiService = inject(ApiService);
  private urlService = inject(UrlService);
  private computeEventsService = inject(ComputeEventsService);
  private appService = inject(AppService);

  refresh = signal(0);
  refreshBtnDisabled = signal(false);
  extendPTIBtnDisabled = signal(false);
  addPTIBtnDisabled = signal(false);
  showToolMenu = signal(false);
  isUpdatingEvent = signal(false);

  updateEvents = effect(() => {
    const url = this.urlService.url();
    const tenant = this.urlService.tenant();
    if (!url || !tenant) return;
    if (this.refresh()) console.log('live monitor page refreshed');

    this.updateDriverDailyLogEvents(url, tenant.id);
  });

  driverDailyLog = signal<null | IDriverDailyLogEvents>(null);
  computedDailyLogEvents = signal<null | IEvent[]>(null);

  driverInfo = computed(() => {
    const currentTenant = this.urlService.tenant();
    const ddle = this.driverDailyLog();
    const tenantsLog = this.appService.tenantsLogSignal();
    if (!currentTenant || !ddle || Object.keys(tenantsLog).length === 0)
      return null;

    const driverInfo = tenantsLog[currentTenant.id].items.find(
      (d) => d.id === ddle.driverId
    );

    return driverInfo;
  });

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
      this.refreshBtnDisabled.set(false);
      this.isUpdating.set(false);
      return;
    }

    this.apiService
      .getDriverDailyLogEvents(id, timestamp, tenantId)
      .pipe(
        tap((driverDailyLog) => {
          this.driverDailyLog.set(driverDailyLog);

          if (driverDailyLog.coDrivers && driverDailyLog.coDrivers[0]?.id) {
            const coId = driverDailyLog.coDrivers[0].id;
            this.apiService
              .getDriverDailyLogEvents(coId, timestamp, tenantId)
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
    this.refreshBtnDisabled.set(false);
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
