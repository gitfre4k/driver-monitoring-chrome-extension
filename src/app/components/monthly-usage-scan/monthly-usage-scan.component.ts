import { Component, computed, inject, signal } from '@angular/core';
import { DateTime } from 'luxon';
import { ApiService } from '../../@services/api.service';
import { concatMap, from, map, mergeMap, Subscription, tap } from 'rxjs';
import { IDriverDailyLogEvents } from '../../interfaces/driver-daily-log-events.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-monthly-usage-scan',
  imports: [CommonModule],
  templateUrl: './monthly-usage-scan.component.html',
  styleUrl: './monthly-usage-scan.component.scss',
})
export class MonthlyUsageScanComponent {
  private apiService = inject(ApiService);
  davaiSub = new Subscription();

  constant = 0;
  progress = signal(0);

  monthlyScanResult = signal(
    {} as {
      [driverName: string]: IDriverDailyLogEvents[];
    }
  );

  vehiclesActiveDays = computed(() => {
    const scanResult = this.monthlyScanResult();

    const vehiclesActiveDays = {} as {
      [id: number]: { name: string; activeDaysCount: number };
    };

    for (const driver in scanResult) {
      scanResult[driver].forEach((log) =>
        log.vehicles.forEach(
          (truck) =>
            this.wasTruckActive(log, truck.id) &&
            (vehiclesActiveDays[truck.id]
              ? vehiclesActiveDays[truck.id].activeDaysCount++
              : (vehiclesActiveDays[truck.id] = {
                  name: truck.name,
                  activeDaysCount: 1,
                }))
        )
      );
    }

    return vehiclesActiveDays;
  });

  wasTruckActive(log: IDriverDailyLogEvents, id: number) {
    for (let i = 0; i < log.events.length; i++) {
      if (
        log.events[i].vehicleId === id &&
        ['ChangeToDrivingStatus', 'ChangeToOnDutyNotDrivingStatus'].includes(
          log.events[i].dutyStatus
        )
      )
        return true;
    }
    return false;
  }

  davaiMadaFakinDateRange({
    dateFrom,
    dateTo,
  }: {
    dateFrom: DateTime;
    dateTo: DateTime;
  }) {
    const dates: DateTime[] = [];
    let currentDay = dateFrom.startOf('day');

    while (currentDay <= dateTo.startOf('day')) {
      dates.push(currentDay);
      currentDay = currentDay.plus({ days: 1 });
    }

    return dates as DateTime<true>[];
  }

  // ASTRA ~ tenant ID ~ 3a1758eb-7650-97b5-abde-26d631e2c39e
  davai = () => {
    const zoneName = DateTime.local().zoneName;
    const date = DateTime.now().setZone(zoneName).startOf('day');

    const dateTo = date.startOf('month');
    const dateFrom = dateTo.minus({ month: 1 });
    if (!dateTo || !dateFrom) return;

    console.log('~~~ getMadaFakinMadaFakaRakkaMakkaTon ~~~');
    console.log('dateFrom: ', dateFrom);
    console.log('dateTo: ', dateTo);

    const dateRange = this.davaiMadaFakinDateRange({ dateFrom, dateTo });

    this.davaiSub = this.apiService
      .getMadaFakinLogs('3a1758eb-7650-97b5-abde-26d631e2c39e', dateRange)
      .pipe(
        tap(
          (log) => (this.constant = 100 / (log.totalCount * dateRange.length))
        ),
        mergeMap((logs) => from(logs.items)),
        concatMap((driver) =>
          from(dateRange).pipe(
            map((day) => ({ id: driver.id, date: day.toUTC().toISO() }))
          )
        )
      )
      .pipe(
        concatMap((logInfo) =>
          this.apiService.getMadaFakinDriverDailyLogEvents(
            logInfo.id,
            logInfo.date,
            '3a1758eb-7650-97b5-abde-26d631e2c39e'
          )
        )
      )
      .subscribe({
        next: (log) => {
          console.log('~~~ getMadaFakinMadaFakaRakkaMakkaTonLOGSAaaaa ~~~');
          console.log(log.driverFullName);
          console.log(log.date);
          console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
          console.log(log);
          console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');

          this.progress.update((currentState) => currentState + this.constant);

          if (this.monthlyScanResult()[log.driverFullName]?.length > 0) {
            this.monthlyScanResult.update((currentState) => ({
              ...currentState,
              [log.driverFullName]: [...currentState[log.driverFullName], log],
            }));
          } else {
            this.monthlyScanResult.update((currentState) => ({
              ...currentState,
              [log.driverFullName]: [log],
            }));
          }
        },
      });
  };

  noDavai = () => this.davaiSub.unsubscribe();
}
