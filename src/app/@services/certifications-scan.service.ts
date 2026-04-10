import { inject, Injectable, signal } from '@angular/core';
import { AppService } from './app.service';
import { catchError, from, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { ApiService } from './api.service';
import { DateService } from './date.service';
import { ProgressBarService } from './progress-bar.service';
import { ConstantsService } from './constants.service';

@Injectable({
  providedIn: 'root',
})
export class CertificationsScanService {
  appService = inject(AppService);
  apiService = inject(ApiService);
  dateService = inject(DateService);
  progressBarService = inject(ProgressBarService);
  constantsService = inject(ConstantsService);

  httpLimit = this.constantsService.httpLimit;

  excludeNonWorkDays = signal(true);

  get driverLogs$() {
    this.progressBarService.initializeState('cert');
    this.progressBarService.scanning.set(true);

    const tenants = this.appService.tenantsSignal();
    const companyLogs$ = from(tenants).pipe(
      mergeMap((tenant) => {
        return this.apiService
          .getLogs(tenant, this.dateService.getLogsDateRange())
          .pipe(
            tap({
              error: (error) => {
                this.progressBarService.cErrors.update((prev) => [
                  ...prev,
                  {
                    error,
                    company: tenant,
                  },
                ]);
              },
            }),
            catchError(() => of()),

            switchMap((logs) => {
              let drivers = logs.items;
              drivers.forEach((driver) => {
                driver.tenant = tenant;
              });
              return drivers;
            }),
          );
      }, this.httpLimit()),
    );

    return companyLogs$.pipe(
      mergeMap((driver) => {
        this.progressBarService.currentCompany.set(driver.tenant!.name);
        this.progressBarService.activeDriversCount.update((prev) => prev + 1);
        return this.apiService.getDriverLogs(driver.tenant!, driver.id).pipe(
          tap({
            error: (error) => {
              this.progressBarService.cErrors.update((prev) => [
                ...prev,
                {
                  error,
                  company: driver.tenant!,
                  driverName: driver.fullName,
                },
              ]);
            },
          }),
          catchError(() => of()),
          map((driverLogs) => {
            let newLogs = { ...driverLogs };

            let uncertifiedDays = [...driverLogs.items];

            uncertifiedDays.sort((a, b) => {
              const dateA = new Date(a.id);
              const dateB = new Date(b.id);
              return dateB.getTime() - dateA.getTime();
            });
            uncertifiedDays.shift();
            uncertifiedDays = uncertifiedDays.filter((day) => !day.certified);

            this.excludeNonWorkDays() &&
              (uncertifiedDays = uncertifiedDays.filter(
                (day) => day.minutesWorked,
              ));

            newLogs.tenant = driver.tenant!;
            newLogs.driverName = driver.fullName;
            newLogs.driverId = driver.id;
            newLogs.zone = driver.homeTerminalTimeZone;
            newLogs.items = uncertifiedDays;
            return newLogs;
          }),
        );
      }, this.httpLimit()),
    );
  }
}
