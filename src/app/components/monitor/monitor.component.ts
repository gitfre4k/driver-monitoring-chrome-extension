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

  offset = new Date().getTimezoneOffset();
}
