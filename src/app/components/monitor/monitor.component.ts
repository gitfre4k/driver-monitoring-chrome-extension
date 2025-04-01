import { Component, inject } from '@angular/core';

import { CommonModule, DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { MonitorService } from '../../services/monitor.service';

@Component({
  selector: 'app-monitor',
  imports: [CommonModule],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.scss',
  providers: [
    { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: 'UTC+1' } },
  ],
})
export class MonitorComponent {
  private monitorService = inject(MonitorService);

  driverDailyLogEvents = this.monitorService.driverDailyLogEvents;
  events = this.monitorService.events;

  offset = new Date().getTimezoneOffset();
}
