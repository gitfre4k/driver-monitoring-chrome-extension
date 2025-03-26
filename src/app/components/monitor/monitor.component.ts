import { Component, computed, effect, inject, signal } from '@angular/core';
import { MonitorService } from '../../ser../../services/monitor.service';
import { ApiService } from '../../services/api.service';
import { IDriverDailyLogEvents } from '../../interfaces/driver-daily-log-events.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-monitor',
  imports: [CommonModule],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.scss',
})
export class MonitorComponent {
  private monitorService = inject(MonitorService);
  private apiService = inject(ApiService);

  url = this.monitorService.url;
  tenant = this.monitorService.tenant;
  driverDailyLogEvents = signal({} as IDriverDailyLogEvents);

  // monitorState = computed(() => {
  //   const url = this.url();
  //   const tenant = this.tenant();
  //   const driverDailyLogEvents = this.driverDailyLogEvents();
  //   if (url && tenant && Object.keys(driverDailyLogEvents).length !== 0) {
  //     const state = {
  //       company: {
  //         name: tenant.name,
  //         id: tenant.id
  //       },
  //       driverDailyLogEvents: {
  //         events: driverDailyLogEvents.events,
  //       }
  //     }
  //   }
  // });

  updateDriverDailyLogEventsEffect = effect(() => {
    const url = this.url();
    const tenant = this.tenant();
    if (!url || !tenant) return;

    const parts = url.split('/');
    const logs = parts[3];
    const id = parts[4];
    const timestamp = parts[5];
    if (logs !== 'logs' || id === undefined || timestamp === undefined) return;

    console.log('// updateDriverDailyLogEventsEffect -> subscribe');
    const subscription = this.apiService
      .getDriverDailyLogEvents(+id, timestamp, tenant.id)
      .subscribe({
        next: (ddle) => this.driverDailyLogEvents.set(ddle),
      });

    return () => {
      if (subscription) {
        console.log('// updateDriverDailyLogEventsEffect -> unsubscribe');
        subscription.unsubscribe();
      }
    };
  });
}

// {"prologs":{"id":"3a17cf3f-6679-c76d-0e6c-b1b66e372336","name":"Autolift, INC"}}

// console.log(JSON.parse(this.tenant() as string))
