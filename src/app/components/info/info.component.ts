import { Component, inject, signal } from "@angular/core";
import { AppService } from "../../@services/app.service";
import { CommonModule } from "@angular/common";
import { ApiService } from "../../@services/api.service";
import { IDriver } from "../../interfaces";
import { MonitorService } from "../../@services/monitor.service";
import { DateAgoPipe } from "../../pipes/date-ago.pipe";
import { concatMap, from, map, mergeMap, switchMap, tap } from "rxjs";
import { DateTime } from "luxon";
import { DateService } from "../../@services/date.service";
import { AdminPortalService } from "../../@services/admin-portal.service";
import { ApiPrologsAdminService } from "../../@services/api-prologs-admin.service";
import { formatTenantName } from "../../helpers/monitor.helpers";

@Component({
  selector: "app-info",
  imports: [CommonModule, DateAgoPipe],
  templateUrl: "./info.component.html",
  styleUrl: "./info.component.scss",
})
export class InfoComponent {
  appService = inject(AppService);
  apiService = inject(ApiService);
  monitorService = inject(MonitorService);
  dateService = inject(DateService);
  apiPrologsAdminService = inject(ApiPrologsAdminService);

  driver = signal<IDriver | null>(null);

  lowVersion: { [key: string]: string[] } = {};

  constructor() {}

  getVehicleLocationHistory() {
    const t = this.appService.currentTenant();
    const d = this.monitorService.driverDailyLog();
    this.apiPrologsAdminService
      .getVehicleLocationHistory(t!.id, d!.events[0].vehicleId)
      .subscribe((data) => console.log(data));
  }

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
          companyName !== "Dex Solutions" &&
            (logOutput[companyName] = logs.totalCount);
        }),
      )
      .subscribe({
        complete: () => {
          // 1. Convert the object into an array of [companyName, value] pairs.
          const entries = Object.entries(logOutput);

          // 2. Sort the array entries by value in descending order (highest to lowest).
          entries.sort((a, b) => b[1] - a[1]);

          // 3. Initialize the group structure to hold both company names and the running total.
          const groups: {
            [key: string]: { companies: string[]; total: number };
          } = {
            A: { companies: [], total: 0 },
            B: { companies: [], total: 0 },
            C: { companies: [], total: 0 },
          };

          // Define the group names for easy iteration.
          const groupKeys = ["A", "B", "C"];

          // 4. Distribute the sorted entries using a Greedy approach to balance the totals.
          // The largest remaining item is always assigned to the group with the current minimum total.
          entries.forEach(([companyName, value]) => {
            // Find the group with the current minimum total value.
            let minTotal = Infinity;
            let targetKey = groupKeys[0]; // Start with 'A' as the default target

            for (const key of groupKeys) {
              if (groups[key].total < minTotal) {
                minTotal = groups[key].total;
                targetKey = key;
              }
            }

            // Assign the current item to the group with the smallest sum.
            groups[targetKey].companies.push(`${companyName} (${value})`);
            groups[targetKey].total += value;
          });

          return console.log(groups);
        },
      });
  }
}
