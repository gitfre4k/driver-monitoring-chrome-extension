import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { concatMap, from, mergeMap, tap } from 'rxjs';
import { IDriver, ITenant } from '../interfaces';
import { IDriverDailyLogEvents } from '../interfaces/driver-daily-log-events.interface';
import { ProgressBarService } from './progress-bar.service';

@Injectable({
  providedIn: 'root',
})
export class AdvancedScanService {
  private apiService: ApiService = inject(ApiService);
  private progressBarService = inject(ProgressBarService);

  sliderValue = signal(5400); // 1h30min

  currentCompany = signal({} as ITenant);
  detectedOnDuties = this.progressBarService.prolengedOnDuties;

  constructor() {}

  allTetants$ = () => {
    return this.apiService.getAccessibleTenants().pipe(
      tap((tenants) => {
        this.progressBarService.constant.set(100 / tenants.length);
      }),
      mergeMap((tenant) => from(tenant))
    );
  };

  dailyLogEvents$(driver: IDriver) {
    return this.apiService
      .getDriverDailyLogEvents(
        driver.id,
        new Date('2025-05-22T05:00:00.000Z'), // 2025-05-20T05:00:00.000Z 2025-05-19T05:00:00.000Z
        this.currentCompany().id
      )

      .pipe(
        tap((driverDailyLogs) =>
          this.handleDriverDailyLogEvents(driverDailyLogs)
        )
      );
  }

  handleDriverDailyLogEvents(driverDailyLogs: IDriverDailyLogEvents) {
    console.log(driverDailyLogs.driverFullName, driverDailyLogs);
    let events = driverDailyLogs.events;
    for (let i = 0; i < events.length; i++) {
      if (
        events[i].dutyStatus === 'ChangeToOnDutyNotDrivingStatus' &&
        (events[i].realDurationInSeconds > this.sliderValue() ||
          events[i].durationInSeconds > this.sliderValue())
      ) {
        this.detectedOnDuties.push({
          driverName: driverDailyLogs.driverFullName,
          company: driverDailyLogs.companyName,
          id: events[i].eventSequenceNumber,
          duration: {
            logged: events[i].durationInSeconds,
            real: events[i].realDurationInSeconds,
          },
        });
      }
    }
  }

  getLogs() {
    this.progressBarService.scanning.set(true);
    return this.allTetants$().pipe(
      concatMap((tenant) => {
        this.currentCompany.set(tenant);
        this.progressBarService.currentCompany.set(this.currentCompany().name);

        return this.apiService.getLogs(tenant).pipe(
          tap(() =>
            this.progressBarService.progressValue.update(
              (prevValue) => prevValue + this.progressBarService.constant()
            )
          ),
          mergeMap((log) => from(log.items)),
          tap((drivers) =>
            console.log(
              'Company: ',
              this.currentCompany.name,
              'Active Drivers: ',
              drivers
            )
          ),
          concatMap((driver) => this.dailyLogEvents$(driver))
        );
      })
    );
  }
}
