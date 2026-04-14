import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AppService } from './app.service';
import { ProgressBarService } from './progress-bar.service';
import { concatMap, from, map, switchMap, tap } from 'rxjs';
import { DateService } from './date.service';

@Injectable({
  providedIn: 'root',
})
export class ActiveDriverCountService {
  appService = inject(AppService);
  apiService = inject(ApiService);
  dateService = inject(DateService);

  getDriversDailyLogs() {
    const tenants = this.appService.tenantsSignal();

    return from(tenants).pipe(
      concatMap((tenant) => {
        return this.apiService
          .getLogs(tenant, this.dateService.getLogsDateRange())
          .pipe(map((log) => ({ ...log, tenant })));
      }),
    );
  }
}
