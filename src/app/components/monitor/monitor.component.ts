import { Component, effect, inject } from '@angular/core';

import { CommonModule } from '@angular/common';
import { MonitorService } from '../../services/monitor.service';

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
