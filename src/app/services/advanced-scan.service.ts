import { inject, Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { concatMap, from, mergeMap, tap } from 'rxjs';
import { ITenant } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class AdvancedScanService {
  private apiService: ApiService = inject(ApiService);

  sliderValue = 5400; // 1h30min
  progress = 0;
  constant = 0;

  currentCompany!: ITenant;
  detectedOnDuties: {
    driverName: string;
    company: string;
    id: string;
    duration: { logged: number; real: number };
  }[] = [];

  constructor() {}

  getLogs() {
    // get All Drivers
    return this.apiService
      .getAccessibleTenants()
      .pipe(
        tap((tenants) => {
          this.constant = +(100 / tenants.length).toFixed(2);
          this.progress = this.constant;
        }),
        mergeMap((tenant) => from(tenant))
        // take(10)
      )
      .pipe(
        concatMap((tenant) => {
          this.currentCompany = tenant;
          console.log(this.currentCompany.name);
          return this.apiService.getLogs(tenant).pipe(
            tap(() => (this.progress += this.constant)),
            mergeMap((log) => from(log.items)),
            tap((drivers) =>
              console.log(
                'Company: ',
                this.currentCompany.name,
                'Active Drivers: ',
                drivers
              )
            ),
            concatMap((driver) =>
              this.apiService
                .getDriverDailyLogEvents(
                  driver.id,
                  new Date('2025-05-20T05:00:00.000Z'), // 2025-05-20T05:00:00.000Z 2025-05-19T05:00:00.000Z
                  this.currentCompany.id
                )

                .pipe(
                  tap((driverDailyLogs) => {
                    console.log(
                      driverDailyLogs.driverFullName,
                      driverDailyLogs
                    );
                    let events = driverDailyLogs.events;
                    for (let i = 0; i < events.length; i++) {
                      if (
                        events[i].dutyStatus ===
                          'ChangeToOnDutyNotDrivingStatus' &&
                        (events[i].realDurationInSeconds > this.sliderValue ||
                          events[i].durationInSeconds > this.sliderValue)
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
                  })
                )
            )
          );
        })
      );
  }
}
