import { inject, Injectable, signal } from "@angular/core";
import { ProgressBarService } from "./progress-bar.service";
import { AppService } from "./app.service";
import {
  catchError,
  concatMap,
  from,
  mergeMap,
  of,
  take,
  tap,
  toArray,
} from "rxjs";
import { DateTime } from "luxon";
import { SmartFixService } from "./smart-fix.service";
import { ApiService } from "./api.service";
import { DateService } from "./date.service";
import { ConstantsService } from "./constants.service";
import { AdvancedScanService } from "./advanced-scan.service";
import { MatSnackBar } from "@angular/material/snack-bar";

@Injectable({
  providedIn: "root",
})
export class GlobalSmartfFixService {
  private appService = inject(AppService);
  private progressBarService = inject(ProgressBarService);
  private smartFixService = inject(SmartFixService);
  private apiService = inject(ApiService);
  private dateService = inject(DateService);
  private advancedScanService = inject(AdvancedScanService);

  private _snacBar = inject(MatSnackBar);

  constantService = inject(ConstantsService);
  httpLimit = this.constantService.httpLimit;

  includeCoDrivers = signal(false);

  initiateGlobalSmartFix(date: string = this.dateService.analyzeDate) {
    const isReadyForSmartFix = this.advancedScanService.isReadyForSmartFix();
    const analyzedCoDrivers = this.advancedScanService.analyzedCoDrivers();

    if (!isReadyForSmartFix) {
      this._snacBar.open(
        "Please complete Driver Log Analysis with 'remove Engine events during Driving' enabled before initiating SmartFix.",
        "Close",
        {
          duration: 5000,
        },
      );
      return of();
    } else {
      const tenants = this.appService.tenantsSignal();
      this.progressBarService.initializeState("advanced");
      this.progressBarService.scanning.set(true);

      return from(tenants).pipe(
        take(10),
        concatMap((tenant) => {
          this.progressBarService.currentCompany.set(tenant.name);
          const qDate = DateTime.fromISO(date).toJSDate();

          return this.apiService
            .getLogs(tenant, this.dateService.getLogsCustomDateRange(qDate))
            .pipe(
              tap({
                error: (error) => {
                  this.progressBarService.progressValue.update(
                    (value) => value + this.progressBarService.constant(),
                  );
                  this.progressBarService.aErrors.update((prev) => [
                    ...prev,
                    {
                      error,
                      company: tenant,
                    },
                  ]);
                },
              }),
              catchError(() => of()),
              tap(() =>
                this.progressBarService.progressValue.update(
                  (prevValue) => prevValue + this.progressBarService.constant(),
                ),
              ),

              concatMap((log) => from(log.items)),
              mergeMap((driver) => {
                this.progressBarService.activeDriversCount.update((i) => i + 1);

                if (
                  !this.includeCoDrivers &&
                  analyzedCoDrivers[tenant.id].includes(driver.id)
                ) {
                  return of();
                } else
                  return this.smartFixService
                    .smartFix(tenant.id, driver.id, date)
                    .pipe(
                      tap((response) => {
                        if (response.length) {
                          this.progressBarService.smartFixErrors.update(
                            (prev) => ({
                              ...prev,
                              [tenant.name]: prev[tenant.name]
                                ? [
                                    ...prev[tenant.name],
                                    {
                                      driverName: driver.fullName,
                                      driverId: driver.id,
                                      errorMessage: response[0].errorMessage,
                                      tenant,
                                    },
                                  ]
                                : [
                                    {
                                      driverName: driver.fullName,
                                      driverId: driver.id,
                                      errorMessage: response[0].errorMessage,
                                      tenant,
                                    },
                                  ],
                            }),
                          );
                        }
                      }),
                    );
              }, this.httpLimit()),
              toArray(),
            );
        }),
      );
    }
  }
}
