import { Component, inject, signal } from '@angular/core';
import { AppService } from '../../@services/app.service';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../@services/api.service';
import { IDriver } from '../../interfaces';
import { MonitorService } from '../../@services/monitor.service';
import { DateAgoPipe } from '../../pipes/date-ago.pipe';
import { concatMap, from, map, mergeMap, tap } from 'rxjs';
import { DateTime } from 'luxon';
import { DateService } from '../../@services/date.service';

@Component({
  selector: 'app-info',
  imports: [CommonModule, DateAgoPipe],
  templateUrl: './info.component.html',
  styleUrl: './info.component.scss',
})
export class InfoComponent {
  appService = inject(AppService);
  apiService = inject(ApiService);
  monitorService = inject(MonitorService);
  dateService = inject(DateService);

  driver = signal<IDriver | null>(null);

  lowVersion: { [key: string]: string[] } = {};

  constructor() {}

  getLogs = () => {
    const t = this.appService.currentTenant();
    const d = this.monitorService.driverDailyLog();
    if (t && d) {
      this.apiService.getLogs(t, new Date()).subscribe({
        next: (logs) => {
          const currentDriver = logs.items.find(
            (driver) => driver.id === d.driverId
          );
          console.log(currentDriver, logs, d);
          currentDriver && this.driver.set(currentDriver);
        },
      });
    } else this.driver.set(null);
  };
}
