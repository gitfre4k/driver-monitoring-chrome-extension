import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import {
  ISmartFixErrorResponse,
  ISmartFixParsedErrorDetails,
  ISmartFixResponse,
} from '../interfaces/api.interface';
import { catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SmartFixService {
  http = inject(HttpClient);

  smartFixClassic(
    from: string,
    to: string,
    tenantId: string,
    driverId: number,
  ) {
    const url = 'https://app.monitoringdriver.com/api/Logs/SmartFixEvents';

    const body = {
      driverId,
      fixEventsDirection: 'FromLastEvent',
      from,
      to,
    };

    return this.http.post<[] | [ISmartFixResponse]>(url, body, {
      withCredentials: true,
      headers: {
        'x-client-timezone': `${DateTime.local().zoneName}`,
        'X-Tenant-Id': tenantId,
      },
    });
  }

  smartFix(tenantId: string, driverId: number, date: string) {
    const currentDay = DateTime.fromISO(date);

    const currentDate = currentDay.toUTC().toISO()!;
    const seventDaysAgo = currentDay.minus({ days: 7 }).toUTC().toISO()!;

    return this.smartFixClassic(
      seventDaysAgo,
      currentDate,
      tenantId,
      driverId,
    ).pipe(
      catchError((err: { error: ISmartFixErrorResponse }) => {
        if (err.error.code === 'FixEvents.SourceEventsInspectedByFmcsa') {
          const errorDetails: ISmartFixParsedErrorDetails = JSON.parse(
            err.error.details,
          );
          const tryFrom = DateTime.fromISO(errorDetails.ReportTimeTo)
            .startOf('day')
            .plus({ days: 1 });

          if (+tryFrom.toFormat('dd') > +currentDay.toFormat('dd'))
            return throwError(() => err);

          return this.smartFixClassic(
            tryFrom.toUTC().toISO()!,
            currentDate,
            tenantId,
            driverId,
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
const zww = {
  code: 'FixEvents.SourceEventsInspectedByFmcsa',
  message: "Events were inspected by FMCSA on '10/19/2025 2:18:13 PM'",
  details:
    '{"Id":"3a1d0f02-a326-3e6d-ad5b-12476bdeadae","Time":"2025-10-19T14:18:13.67159Z","ReportTimeFrom":"2025-10-12T14:18:07.667Z","ReportTimeTo":"2025-10-19T14:18:07.667Z"}',
  data: {},
};

const dt = DateTime.fromFormat('10/19/2025', 'MM/dd/yyyy');
