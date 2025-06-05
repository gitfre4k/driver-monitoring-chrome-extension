import { Component, inject } from '@angular/core';

import { CommonModule, DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { MonitorService } from '../../@services/monitor.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-monitor',
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.scss',
  providers: [
    { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: 'UTC+1' } },
  ],
})
export class MonitorComponent {
  private monitorService = inject(MonitorService);

  driverDailyLogEvents = this.monitorService.driverDailyLog;
  events = this.monitorService.computedDailyLogEvents;
  isLoading = this.monitorService.isUpdating;

  offset = new Date().getTimezoneOffset();

  refresh = () => {
    this.monitorService.refresh.update((value) => value + 1);
  };
}
