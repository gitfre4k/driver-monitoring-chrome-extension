import { Injectable, inject, computed, signal, effect } from '@angular/core';
import { ApiService } from './api.service';
import {
  IDriverDailyLogEvents,
  IEvent,
} from '../interfaces/driver-daily-log-events.interface';

import { Subscription } from 'rxjs';

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
    if (!this.driverDailyLogEvents().events) return [];
    return this.driverDailyLogEvents().events.filter((event) =>
      this.filter(event)
    );
  });

  private subscription: Subscription | null = null;

  updateDriverDailyLogEventsEffect = effect(() => {
    const url = this.url();
    const tenant = this.tenant();
    if (!url || !tenant) return;

    this.updateDriverDailyLogEvents(url, tenant.id);
    return () => this.cleanUpSubscription();
  });

  constructor() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'urlChanged') {
        this.url.set(request.data.url);
        this.tenant.set(JSON.parse(request.data.tenant).prologs);
      }
    });
  }

  filter(event: IEvent): boolean {
    return [
      'ChangeInDriversDutyStatus',
      'IntermediateLog',
      'CmvEnginePowerUpOrShutDownActivity',
    ].includes(event.eventType);
  }

  updateDriverDailyLogEvents(url: string, tenantId: string): void {
    if (this.subscription) {
      console.log('// updateDriverDailyLogEvents -> unsubscribe');
      this.subscription.unsubscribe();
      this.subscription = null;
    }

    const parts = url.split('/');
    const logs = parts[3];
    const id = parts[4];
    const timestamp = parts[5];

    if (logs !== 'logs' || id === undefined || timestamp === undefined) return;

    console.log('// updateDriverDailyLogEvents -> subscribe');
    console.log(timestamp);

    const timestampWithOffSet = new Date(
      new Date(new Date(timestamp).setHours(24, 0, 0, 0))
    );

    this.subscription = this.apiService
      .getDriverDailyLogEvents(+id, timestampWithOffSet, tenantId)
      .subscribe({
        next: (ddle) => this.driverDailyLogEvents.set(ddle),
      });
  }

  cleanUpSubscription(): void {
    if (this.subscription) {
      console.log('// updateDriverDailyLogEvents -> unsubscribe');
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}
