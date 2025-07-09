import { Component, inject } from '@angular/core';

import { CommonModule } from '@angular/common';
import { MonitorService } from '../../@services/monitor.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DateService } from '../../@services/date.service';

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
  providers: [],
})
export class MonitorComponent {
  private monitorService = inject(MonitorService);
  private dateService = inject(DateService);

  driverDailyLogEvents = this.monitorService.driverDailyLog;
  events = this.monitorService.computedDailyLogEvents;
  isLoading = this.monitorService.isUpdating;

  refresh = () => {
    this.monitorService.refresh.update((value) => value + 1);
  };

  get date() {
    const ddle = this.driverDailyLogEvents();
    if (!ddle) return new Date();

    return this.dateService.getFormatedDates(new Date(ddle.date)).date;
  }
}
