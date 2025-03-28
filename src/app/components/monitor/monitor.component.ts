import { Component, effect, inject } from '@angular/core';

import { CommonModule } from '@angular/common';
import { MonitorService } from '../../services/monitor.service';
import { IEvent } from '../../interfaces/driver-daily-log-events.interface';

@Component({
  selector: 'app-monitor',
  imports: [CommonModule],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.scss',
})
export class MonitorComponent {
  private monitorService = inject(MonitorService);

  driverDailyLogEvents = this.monitorService.driverDailyLogEvents;
  events = this.monitorService.events;

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

  isTeleport(ev1: IEvent, ev2: IEvent) {
    const mileageDifference = Math.abs(ev1.odometer - ev2.odometer);
    if (mileageDifference > 2) {
      if (!this.isDriving(ev1) && !this.isInter(ev1)) return true;
    }

    return false;
  }

  detectTeleport = () => {
    const events = this.events();
    for (let i = 0; i < events.length - 1; i++) {
      this.isTeleport(events[i], events[i + 1]) &&
        console.log(
          `Round ${i + 1}: \n`,
          this.getStatusName(events[i].dutyStatus),
          ' vs ',
          this.getStatusName(events[i + 1].dutyStatus),
          '\n',
          this.isTeleport(events[i], events[i + 1])
        );
    }
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
}
