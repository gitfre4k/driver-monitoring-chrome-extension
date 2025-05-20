import { Component, inject } from '@angular/core';
import { ApiService } from '../services/api.service';
import { CommonModule } from '@angular/common';
import { concatMap, from, map, mergeMap, take, tap } from 'rxjs';
import { ITenant } from '../interfaces';

@Component({
  selector: 'app-test',
  imports: [CommonModule],
  templateUrl: './test.component.html',
  styleUrl: './test.component.scss',
})
export class TestComponent {
  private apiService: ApiService = inject(ApiService);

  currentCompany!: ITenant;
  detectedOnDuties: { driverName: string; company: string; id: string }[] = [];

  getLogs() {
    // get All Drivers
    const getAllDrivers = this.apiService
      .getAccessibleTenants()
      .pipe(
        mergeMap((tenant) => from(tenant))
        // take(10)
      )
      .pipe(
        concatMap((tenant) => {
          this.currentCompany = tenant;
          console.log(this.currentCompany.name);
          return this.apiService.getLogs(tenant).pipe(
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
                  new Date('2025-05-19T05:00:00.000Z'),
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
                        (events[i].realDurationInSeconds > 7200 ||
                          events[i].durationInSeconds > 7200)
                      ) {
                        this.detectedOnDuties.push({
                          driverName: driverDailyLogs.driverFullName,
                          company: driverDailyLogs.companyName,
                          id: events[i].eventSequenceNumber,
                        });
                      }
                    }
                  })
                )
            )
          );
        })
      )
      .subscribe();
  }
}
