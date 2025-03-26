import { Component, computed, effect, inject, signal } from '@angular/core';
import { MonitorService } from '../../ser../../services/monitor.service';
import { ApiService } from '../../services/api.service';
import {
  IDriverDailyLogEvents,
  IEvent,
} from '../../interfaces/driver-daily-log-events.interface';
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

  getStatusName(dutyStatus: string) {
    let statusName = '';
    switch (dutyStatus) {
      case 'ChangeToOffDutyStatus':
        statusName = 'Off Duty';
        break;
      case 'ChangeToSleeperBerthStatus':
        statusName = 'Sleeper Berth';
        break;
      case 'ChangeToDrivingStatus':
        statusName = 'Driving';
        break;
      case 'ChangeToOnDutyNotDrivingStatus':
        statusName = 'On Duty';
        break;
      case 'IntermediateLogConventionalLocationPrecision':
        statusName = 'Intermediate';
        break;
      case 'IntermediateLogReducedLocationPrecision':
        statusName = 'Intermediate';
        break;
      case 'EnginePowerUpConventionalLocationPrecision':
        statusName = 'Engine';
        break;
      case 'EnginePowerUpReducedLocationPrecision':
        statusName = 'Engine';
        break;
      case 'EngineShutDownConventionalLocationPrecision':
        statusName = 'Engine';
        break;
      case 'EngineShutDownReducedLocationPrecision':
        statusName = 'Engine';
        break;
    }
    return statusName;
  }

  filter(event: IEvent) {
    if (
      [
        'ChangeInDriversDutyStatus',
        'IntermediateLog',
        'CmvEnginePowerUpOrShutDownActivity',
      ].includes(event.eventType)
    )
      return true;
    return false;
  }

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
    const timestampWithOffSet = new Date(new Date(timestamp).setHours(24));
    const subscription = this.apiService
      .getDriverDailyLogEvents(+id, timestampWithOffSet, tenant.id)
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
