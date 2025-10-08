import { Component, inject, signal } from '@angular/core';
import { AppService } from '../../@services/app.service';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../@services/api.service';
import { IDriver } from '../../interfaces';
import { MonitorService } from '../../@services/monitor.service';
import { DateAgoPipe } from '../../pipes/date-ago.pipe';
import { from, map, mergeMap, switchMap, tap } from 'rxjs';
import { DateTime } from 'luxon';
import { DateService } from '../../@services/date.service';
import { formatTenantName } from '../../helpers/monitor.helpers';
import { ConstantsService } from '../../@services/constants.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-info',
  imports: [CommonModule, DateAgoPipe, MatButtonModule],
  templateUrl: './info.component.html',
  styleUrl: './info.component.scss',
})
export class InfoComponent {
  appService = inject(AppService);
  apiService = inject(ApiService);
  monitorService = inject(MonitorService);
  dateService = inject(DateService);
  constService = inject(ConstantsService);

  isDisabledElConejo = false;

  driver = signal<IDriver | null>(null);

  constructor() {}

  getLogs = () => {
    const t = this.appService.currentTenant();
    const d = this.monitorService.driverDailyLog();
    if (t && d) {
      this.apiService.getLogs(t, this.dateService.fmcsaRange()).subscribe({
        next: (logs) => {
          const currentDriver = logs.items.find(
            (driver) => driver.id === d.driverId,
          );
          console.log(currentDriver, logs, d);
          currentDriver && this.driver.set(currentDriver);
        },
      });
    } else this.driver.set(null);
  };

  logActiveDriversPerCompany() {
    this.isDisabledElConejo = true;
    const logOutput: { [company: string]: number } = {};
    const qDate = DateTime.fromISO(this.dateService.analyzeDate).toJSDate();

    this.apiService
      .getAccessibleTenants()
      .pipe(
        switchMap((tenants) => from(tenants)),
        mergeMap((t) =>
          this.apiService
            .getLogs(t, this.dateService.getLogsCustomDateRange(qDate))
            .pipe(
              map((data) => {
                const logs = { ...data };
                logs.tenant = t;
                return logs;
              }),
            ),
        ),
        tap((logs) => {
          const companyName = formatTenantName(logs.tenant!.name);
          companyName !== 'Dex Solutions' &&
            (logOutput[companyName] = logs.totalCount);
        }),
      )
      .subscribe({
        complete: () => {
          const entries = Object.entries(logOutput);

          entries.sort((a, b) => b[1] - a[1]);

          const groups: {
            [key: string]: { companies: string[]; total: number };
          } = {
            A: { companies: [], total: 0 },
            B: { companies: [], total: 0 },
            C: { companies: [], total: 0 },
          };

          const groupKeys = ['A', 'B', 'C'];

          entries.forEach(([companyName, value]) => {
            let minTotal = Infinity;
            let targetKey = groupKeys[0];

            for (const key of groupKeys) {
              if (groups[key].total < minTotal) {
                minTotal = groups[key].total;
                targetKey = key;
              }
            }

            groups[targetKey].companies.push(`${companyName} (${value})`);
            groups[targetKey].total += value;
          });

          this.isDisabledElConejo = false;
          return console.log(groups);
        },
        error: () => (this.isDisabledElConejo = false),
      });
  }
}
