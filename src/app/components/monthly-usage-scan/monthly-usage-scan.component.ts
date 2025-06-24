import { Component, inject } from '@angular/core';
import { DateTime } from 'luxon';
import { ApiService } from '../../@services/api.service';
import { concatMap, from, map, mergeMap, Observable, Subscription } from 'rxjs';
import { ILog } from '../../interfaces';

@Component({
  selector: 'app-monthly-usage-scan',
  imports: [],
  templateUrl: './monthly-usage-scan.component.html',
  styleUrl: './monthly-usage-scan.component.scss',
})
export class MonthlyUsageScanComponent {
  private apiService = inject(ApiService);
  davaiSub = new Subscription();

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
        next: (data) => {
          console.log('~~~ getMadaFakinMadaFakaRakkaMakkaTonLOGSAaaaa ~~~');
          console.log(data.driverFullName);
          console.log(data.date);
          console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
          console.log(data);
          console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
        },
      });
  };

  noDavai = () => this.davaiSub.unsubscribe();
}
