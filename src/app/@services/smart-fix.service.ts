import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import {
  ISmartFixErrorResponse,
  ISmartFixParsedErrorDetails,
  ISmartFixResponse,
} from '../interfaces/api.interface';
import { catchError, Observable, of, switchMap, throwError, timer } from 'rxjs';

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

  smartFix(
    tenantId: string,
    driverId: number,
    date: string,
  ): Observable<ISmartFixResponse[]> {
    const currentDay = DateTime.fromISO(date);
    const currentDate = currentDay.toUTC().toISO()!;

    const initialSevenDaysAgo = currentDay.minus({ days: 7 }).toUTC().toISO()!;

    const attemptSmartFix = (
      startDate: string,
      retryAttempt: number = 0,
    ): Observable<ISmartFixResponse[]> => {
      return this.smartFixClassic(
        startDate,
        currentDate,
        tenantId,
        driverId,
      ).pipe(
        catchError((err: { error: ISmartFixErrorResponse }) => {
          // check if error code is 'SourceEventsInspectedByFmcsa'
          if (err.error.code === 'FixEvents.SourceEventsInspectedByFmcsa') {
            const nextRetryAttempt = retryAttempt + 1;
            console.warn(
              `Attempt ${retryAttempt + 1} failed. Retrying... (Attempt: ${nextRetryAttempt})`,
            );

            try {
              const errorDetails: ISmartFixParsedErrorDetails = JSON.parse(
                err.error.details,
              );

              const tryFrom = DateTime.fromISO(errorDetails.ReportTimeTo)
                .startOf('day')
                .plus({ days: nextRetryAttempt });

              const tryFromDay = tryFrom.toJSDate().getTime();
              const currentDayDay = currentDay.toJSDate().getTime();

              if (tryFromDay > currentDayDay) return of();

              return attemptSmartFix(
                tryFrom.toUTC().toISO()!,
                nextRetryAttempt,
              );
            } catch (jsonError) {
              // Handle error in JSON parsing if 'details' is invalid
              console.error(
                'Failed to parse error details for retry logic:',
                jsonError,
              );
              return throwError(() => err);
            }
          }
          // For any other error, propagate the error immediately.
          return throwError(() => err);
        }),
      );
    };

    // Start the recursive process with the initial parameters (0 retries)
    return attemptSmartFix(initialSevenDaysAgo, 0);
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
