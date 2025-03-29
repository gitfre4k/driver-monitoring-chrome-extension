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

    const filteredEvents = this.driverDailyLogEvents().events.filter((event) =>
      this.filter(event)
    );
    const eventsWithTPInfo = this.detectAndBindTeleport(filteredEvents);
    return this.bindEventNames(eventsWithTPInfo);
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
  isDriving(ev: IEvent) {
    return this.getStatusName(ev.dutyStatus) === 'Driving';
  }
  isInter(ev: IEvent) {
    return this.getStatusName(ev.dutyStatus) === 'Intermediate';
  }
  isEngine(ev: IEvent) {
    return ['Engine On', 'Engine Off'].includes(
      this.getStatusName(ev.dutyStatus)
    );
  }

  // bindParentID = (importedEvents: IEvent[]) => {
  //   let events = [...importedEvents];
  //   for (let i = 0; i < events.length; i++) {
  //     if (events[i].parentId) {

  //     }
  //   }
  // }

  bindEventNames = (importedEvents: IEvent[]) => {
    let events = [...importedEvents];
    for (let i = 0; i < events.length; i++) {
      events[i].statusName = this.getStatusName(events[i].dutyStatus);
    }
    return events;
  };

  isTeleport(ev1: IEvent, ev2: IEvent) {
    const mileageDifference = Math.abs(ev1.odometer - ev2.odometer);
    if (mileageDifference > 2) {
      if (!this.isDriving(ev1) && !this.isInter(ev1)) return true;
    }

    return false;
  }

  detectAndBindTeleport = (importedEvents: IEvent[]) => {
    let events = [...importedEvents];
    for (let i = 0; i < events.length - 1; i++) {
      this.isTeleport(events[i], events[i + 1]) &&
        console.log(
          `Teleport detected: ${i + 1}: \n`,
          this.getStatusName(events[i].dutyStatus),
          ' vs ',
          this.getStatusName(events[i + 1].dutyStatus)
        );
      events[i + 1].isTeleport = this.isTeleport(events[i], events[i + 1]);
    }
    return events;
  };

  getStatusName(dutyStatus: string): string {
    switch (dutyStatus) {
      case 'ChangeToOffDutyStatus':
        return 'Off Duty';
      case 'ChangeToSleeperBerthStatus':
        return 'Sleeper Berth';
      case 'ChangeToDrivingStatus':
        return 'Driving';
      case 'ChangeToOnDutyNotDrivingStatus':
        return 'On Duty';
      case 'IntermediateLogConventionalLocationPrecision':
      case 'IntermediateLogReducedLocationPrecision':
        return 'Intermediate';
      case 'EnginePowerUpConventionalLocationPrecision':
      case 'EnginePowerUpReducedLocationPrecision':
        return 'Engine On';
      case 'EngineShutDownConventionalLocationPrecision':
      case 'EngineShutDownReducedLocationPrecision':
        return 'Engine Off';
      default:
        return '?';
    }
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
