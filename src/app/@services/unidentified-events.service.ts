import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AppService } from './app.service';
import { finalize, from, mergeMap, tap } from 'rxjs';
import { ProgressBarService } from './progress-bar.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class UnidentifiedEventsService {
  apiService = inject(ApiService);
  appService = inject(AppService);
  progressBarService = inject(ProgressBarService);
  _snackBar = inject(MatSnackBar);

  totalCount = signal(0);

  deleteAllUnidentifiedEvents$() {
    const tenants = this.appService.tenantsSignal();

    this.progressBarService.initializeState('deleteUE');
    this.progressBarService.scanning.set(true);

    return from(tenants)
      .pipe(
        mergeMap((tenant) => {
          return this.apiService.getUnidentifiedEvents(tenant).pipe(
            tap((data) => {
              const eventsArray: number[] = [];
              data.totalCount &&
                data.items.forEach((i) => eventsArray.push(i.id));

              if (eventsArray.length) {
                this.totalCount.update((prev) => prev + eventsArray.length);
                this.apiService
                  .deleteUncertifiedEvents(tenant, eventsArray)
                  .subscribe();
              }
            })
          );
        }, 10)
      )
      .pipe(
        finalize(() => {
          this.progressBarService.scanning.set(false);

          const count = this.totalCount();
          const message =
            count === 0
              ? 'No Unidentified Event detected'
              : `${count} Unidentified Event${
                  count > 1 ? 's' : ''
                } detected and deleted`;
          this._snackBar.open(message, 'OK', {
            duration: 3000,
          });
        })
      );
  }
}
