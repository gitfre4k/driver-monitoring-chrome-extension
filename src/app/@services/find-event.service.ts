import { inject, Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { DateTime } from 'luxon';
import { concatMap, from, map, switchMap, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FindEventService {
  apiService = inject(ApiService);

  KOSTIC_TENANT_ID = '3a0ab2c5-a410-e0ff-5558-0e0d84eddaf2';
  DRIVER_ID = 9;
  LOG_DATE = [
    DateTime.fromISO('2024-05-23').toUTC().toISO(),
    DateTime.fromISO('2024-05-23').minus({ days: 1 }).toUTC().toISO(),
    DateTime.fromISO('2024-05-23').minus({ days: 2 }).toUTC().toISO(),
    DateTime.fromISO('2024-05-23').plus({ days: 1 }).toUTC().toISO(),
    DateTime.fromISO('2024-05-23').plus({ days: 2 }).toUTC().toISO(),
  ];
  LOCATION = '1mi N Hubbard, OH';

  getLataLonga() {
    return from(this.LOG_DATE)
      .pipe(
        tap((date) => console.log('## [Find Event Service] LOG_DATE ', date)),
        concatMap((date) =>
          this.apiService.getDriverDailyLogEvents(
            this.DRIVER_ID,
            date!,
            this.KOSTIC_TENANT_ID
          )
        )
      )
      .subscribe((log) => {
        const TARGET = log.events.find(
          (ev) =>
            ev.locationDisplayName &&
            ev.locationDisplayName.includes('Hubbard, OH')
        );
        if (TARGET)
          console.log('## [Find Event Service] TARGET FOUND - ', TARGET);
        else console.log('## [Find Event Service] NO TARGET');
      });
  }
}
