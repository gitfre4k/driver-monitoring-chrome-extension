import { Injectable, inject, computed, signal, effect } from '@angular/core';
import { ApiService } from './api.service';
import {
  filterEvents,
  bindEventStatusNames,
  detectAndBindTeleport,
  bindEventViewId,
} from '../helpers/monitor.helpers';

import { IDriverDailyLogEvents } from '../interfaces/driver-daily-log-events.interface';

@Injectable({
  providedIn: 'root',
})
export class MonitorService {
  private apiService = inject(ApiService);

  url = signal<string | null>(null);
  tenant = signal<{
    id: string;
    name: string;
  } | null>(null);

  driverDailyLogEvents = signal({} as IDriverDailyLogEvents);

  events = computed(() => {
    let events = this.driverDailyLogEvents().events;
    if (!events) return [];

    events = bindEventViewId(events);
    events = events.filter((event) => filterEvents(event));
    events = bindEventStatusNames(events);
    events = detectAndBindTeleport(events);

    return events;
  });

  updateDriverDailyLogEventsEffect = effect(() => {
    const url = this.url();
    const tenant = this.tenant();
    if (!url || !tenant) return;

    this.updateDriverDailyLogEvents(url, tenant.id);
  });

  constructor() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'urlChanged') {
        this.url.set(request.data.url);
        this.tenant.set(JSON.parse(request.data.tenant).prologs);
      }
    });
  }

  updateDriverDailyLogEvents(url: string, tenantId: string): void {
    const parts = url.split('/');
    const logs = parts[3];
    const id = parts[4];
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
      .getDriverDailyLogEvents(+id, timestampWithOffSet, tenantId)
      .subscribe({
        next: (ddle) => this.driverDailyLogEvents.set(ddle),
      });

    return;
  }
}
