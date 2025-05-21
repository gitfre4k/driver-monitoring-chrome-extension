import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { concatMap, from, mergeMap, tap } from 'rxjs';
import { IDetectedOnDuty, ITenant } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class AdvancedScanService {
  private apiService: ApiService = inject(ApiService);

  sliderValue = signal(5400); // 1h30min
  progress = signal(0);
  constant = signal(0);

  currentCompany = signal({} as ITenant);
  detectedOnDuties = signal([] as IDetectedOnDuty[]);

  constructor() {}

  getLogs() {
    // get All Drivers
    return this.apiService
      .getAccessibleTenants()
      .pipe(
        tap((tenants) => {
          this.constant.set(100 / tenants.length);
        }),
        mergeMap((tenant) => from(tenant))
        // take(10)
      )
      .pipe(
        concatMap((tenant) => {
          this.currentCompany.set(tenant);
          console.log(this.currentCompany.name);
          return this.apiService.getLogs(tenant).pipe(
            tap(() =>
              this.progress.update((prevValue) => prevValue + this.constant())
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
            concatMap((driver) =>
              this.apiService
                .getDriverDailyLogEvents(
                  driver.id,
                  new Date('2025-05-20T05:00:00.000Z'), // 2025-05-20T05:00:00.000Z 2025-05-19T05:00:00.000Z
                  this.currentCompany().id
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
                        (events[i].realDurationInSeconds > this.sliderValue() ||
                          events[i].durationInSeconds > this.sliderValue())
                      ) {
                        this.detectedOnDuties.update((value) => {
                          return [
                            ...value,
                            {
                              driverName: driverDailyLogs.driverFullName,
                              company: driverDailyLogs.companyName,
                              id: events[i].eventSequenceNumber,
                              duration: {
                                logged: events[i].durationInSeconds,
                                real: events[i].realDurationInSeconds,
                              },
                            },
                          ];
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
