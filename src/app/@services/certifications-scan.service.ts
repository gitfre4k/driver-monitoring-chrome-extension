import { inject, Injectable } from '@angular/core';
import { AppService } from './app.service';
import { from, map, mergeMap, of, switchMap } from 'rxjs';
import { ApiService } from './api.service';
import { DateService } from './date.service';
import { ProgressBarService } from './progress-bar.service';

@Injectable({
  providedIn: 'root',
})
export class CertificationsScanService {
  appService = inject(AppService);
  apiService = inject(ApiService);
  dateService = inject(DateService);
  progressBarService = inject(ProgressBarService);

  get driverLogs$() {
    this.progressBarService.initializeState('cert');
    this.progressBarService.scanning.set(true);

    const tenants = this.appService.tenantsSignal();
    const companyLogs$ = from(tenants).pipe(
      mergeMap((tenant) => {
        return this.apiService.getLogs(tenant, this.dateService.today).pipe(
          switchMap((logs) => {
            let drivers = logs.items;
            drivers.forEach((driver) => {
              driver.tenant = tenant;
            });
            return drivers;
          })
        );
      }, 10)
    );

    return companyLogs$.pipe(
      mergeMap((driver) => {
        this.progressBarService.currentCompany.set(driver.tenant!.name);
        this.progressBarService.activeDriversCount.update((prev) => prev + 1);
        return this.apiService.getDriverLogs(driver.tenant!, driver.id).pipe(
          map((driverLogs) => {
            let newLogs = { ...driverLogs };
            newLogs.tenant = driver.tenant!;
            newLogs.driverName = driver.fullName;
            newLogs.driverId = driver.id;
            newLogs.zone = driver.homeTerminalTimeZone;
            return newLogs;
          })
        );
      }, 10)
    );
  }
}
