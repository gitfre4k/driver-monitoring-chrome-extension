import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import {
  catchError,
  concatMap,
  finalize,
  from,
  mergeMap,
  of,
  tap,
  toArray,
} from 'rxjs';
import {
  IDriver,
  IDriverErrorEvents,
  IProlongedOnDutyEvents,
  ITenant,
} from '../interfaces';
import {
  IDailyLogs,
  IEvent,
} from '../interfaces/driver-daily-log-events.interface';
import { ProgressBarService } from './progress-bar.service';
import { AppService } from './app.service';
import { ComputeEventsService } from './compute-events.service';
import { DateService } from './date.service';

@Injectable({
  providedIn: 'root',
})
export class AdvancedScanService {
  private appService = inject(AppService);
  private apiService = inject(ApiService);
  private computeEventsService = inject(ComputeEventsService);
  private progressBarService = inject(ProgressBarService);
  private dateService = inject(DateService);

  prolongedOnDutiesDuration = signal(4200); // 1h10min
  engineHoursDuration = signal(14);
  lowTotalEngineHoursCount = signal(100);
  ptiDuration = signal(781);
  sleeperDuration = signal(30);

  constructor() {}

  misovLog: {
    [companyName: string]: { totalCount: number; drivers: string[] };
  } = {};

  getLogs(date: Date) {
    const tenants = this.appService.tenantsSignal();
    this.progressBarService.initializeState('advanced');
    this.progressBarService.scanning.set(true);

    return from(tenants)
      .pipe(
        concatMap((tenant) => {
          this.progressBarService.currentCompany.set(tenant.name);

          return this.apiService.getLogs(tenant, date).pipe(
            tap(() => console.log('[Advanced Scan Service] ## ', tenant.name)),
            tap({
              error: (error) => {
                this.progressBarService.progressValue.update(
                  (value) => value + this.progressBarService.constant()
                );
                this.progressBarService.errors.push({
                  error,
                  company: tenant,
                });
              },
            }),
            catchError(() => of()),
            tap(() =>
              this.progressBarService.progressValue.update(
                (prevValue) => prevValue + this.progressBarService.constant()
              )
            ),
            tap((log) => {
              const drivers: string[] = [];
              log.items.forEach((d) => drivers.push(d.fullName));
              this.misovLog[tenant.name] = {
                totalCount: log.totalCount,
                drivers,
              };
            }),
            concatMap((log) => from(log.items)),
            mergeMap((driver) => {
              this.progressBarService.activeDriversCount.update((i) => i + 1);
              return this.dailyLogEvents$(driver, tenant, date);
            }, 10),
            toArray()
          );
        })
      )
      .pipe(
        finalize(() => {
          console.log(this.progressBarService.advancedResaults);
          for (let company in this.misovLog) {
            console.log('## ' + company);
            console.log(`[total count]: ${this.misovLog[company].totalCount}`);
            this.misovLog[company].drivers.forEach((d) =>
              console.log(`- ${d}`)
            );
          }
        })
      );
  }

  dailyLogEvents$(driver: IDriver, tenant: ITenant, d: Date) {
    const date = this.dateService.getDailyLogsDate(d)!;
    return this.apiService
      .getDriverDailyLogEvents(driver.id, date, tenant.id)
      .pipe(
        tap({
          error: (error) => {
            this.progressBarService.errors.push({
              error,
              company: tenant,
              driverName: driver.fullName,
            });
          },
        }),
        catchError(() => of()),
        tap((driverDailyLog) => {
          if (driverDailyLog.coDrivers && driverDailyLog.coDrivers[0]?.id) {
            const coId = driverDailyLog.coDrivers[0].id;

            this.apiService
              .getDriverDailyLogEvents(coId, date, tenant.id)
              .pipe(
                tap({
                  error: (error) => {
                    this.progressBarService.errors.push({
                      error,
                      company: tenant,
                      driverName: driver.fullName,
                    });
                  },
                }),
                catchError(() => of())
              )
              .subscribe({
                next: (coDriverDailyLog) =>
                  this.handleDriverDailyLogEvents(
                    {
                      driverDailyLog,
                      coDriverDailyLog,
                    },
                    tenant
                  ),
              });
          } else
            this.handleDriverDailyLogEvents(
              {
                driverDailyLog,
                coDriverDailyLog: null,
              },
              tenant
            );
        })
      );
  }

  handleDriverDailyLogEvents(
    { driverDailyLog, coDriverDailyLog }: IDailyLogs,
    tenant: ITenant
  ) {
    if (!driverDailyLog) return;
    this.progressBarService.currentDriver.set(driverDailyLog.driverFullName);

    const driverEvents = driverDailyLog.events;

    let computedEvents = this.computeEventsService.getComputedEvents(
      {
        driverDailyLog,
        coDriverDailyLog,
      },
      tenant,
      this.ptiDuration(),
      this.prolongedOnDutiesDuration(),
      this.sleeperDuration()
    );
    const errorEvents: IEvent[] = [];
    const detectedTeleportEvents: IEvent[] = [];
    const prolongedOnDutyEvents: IEvent[] = [];
    const manualDrivings: IEvent[] = [];

    computedEvents.forEach((event) => {
      if (event.driver.id === driverDailyLog.driverId) {
        if (event.isTeleport) {
          detectedTeleportEvents.push(event);
        }
        if (event.errorMessages.length > 0) {
          errorEvents.push(event);
        }
        if (event.onDutyDuration) {
          prolongedOnDutyEvents.push(event);
        }
        if (event.manualDriving) {
          manualDrivings.push(event);
        }
      }
    });
    ////////////
    // handle Prolonged On Duty events
    if (prolongedOnDutyEvents.length > 0) {
      const driverProlongedOnDuties: IProlongedOnDutyEvents = {
        driverName: driverDailyLog.driverFullName,
        events: prolongedOnDutyEvents,
      };
      if (
        this.progressBarService.advancedResaults.prolengedOnDuties[
          driverDailyLog.companyName
        ]
      ) {
        this.progressBarService.advancedResaults.prolengedOnDuties[
          driverDailyLog.companyName
        ].push(driverProlongedOnDuties);
      } else {
        this.progressBarService.advancedResaults.prolengedOnDuties[
          driverDailyLog.companyName
        ] = [driverProlongedOnDuties];
      }
    }
    ////////////
    // handle Teleport events
    if (detectedTeleportEvents.length > 0) {
      const driverTeleportEvents = {
        driverName: driverDailyLog.driverFullName,
        events: detectedTeleportEvents,
      };

      if (
        this.progressBarService.advancedResaults.teleports[
          driverDailyLog.companyName
        ]
      ) {
        this.progressBarService.advancedResaults.teleports[
          driverDailyLog.companyName
        ].push(driverTeleportEvents);
      } else {
        this.progressBarService.advancedResaults.teleports[
          driverDailyLog.companyName
        ] = [driverTeleportEvents];
      }
    }
    ////////////
    // handle Error events
    if (errorEvents.length > 0) {
      const driverErrorEvents: IDriverErrorEvents = {
        name: driverDailyLog.driverFullName,
        events: errorEvents,
      };
      if (
        this.progressBarService.advancedResaults.eventErrors[
          driverDailyLog.companyName
        ]
      ) {
        this.progressBarService.advancedResaults.eventErrors[
          driverDailyLog.companyName
        ].push(driverErrorEvents);
      } else {
        this.progressBarService.advancedResaults.eventErrors[
          driverDailyLog.companyName
        ] = [driverErrorEvents];
      }
    }

    for (let i = 0; i < driverEvents.length; i++) {
      //
      // high elapsed Engine Hours
      if (driverEvents[i].elapsedEngineHours >= this.engineHoursDuration()) {
        const highEngineHoursDriver = {
          driverName: driverDailyLog.driverFullName,
          id: driverEvents[i].eventSequenceNumber,
          duration: driverEvents[i].elapsedEngineHours,
        };
        if (
          this.progressBarService.advancedResaults.highEngineHours[
            driverDailyLog.companyName
          ] &&
          this.progressBarService.advancedResaults.highEngineHours[
            driverDailyLog.companyName
          ].find(
            (driver) => driver.driverName === driverDailyLog.driverFullName
          ) === undefined
        ) {
          this.progressBarService.advancedResaults.highEngineHours[
            driverDailyLog.companyName
          ].push(highEngineHoursDriver);
        } else {
          this.progressBarService.advancedResaults.highEngineHours[
            driverDailyLog.companyName
          ] = [highEngineHoursDriver];
        }
      }

      //
      // missing Engine On
      if (driverEvents[i].isEventMissingPowerUp) {
        if (
          this.progressBarService.advancedResaults.missingEngineOn[
            driverDailyLog.companyName
          ] &&
          !this.progressBarService.advancedResaults.missingEngineOn[
            driverDailyLog.companyName
          ].includes(driverDailyLog.driverFullName)
        ) {
          this.progressBarService.advancedResaults.missingEngineOn[
            driverDailyLog.companyName
          ].push(driverDailyLog.driverFullName);
        } else {
          this.progressBarService.advancedResaults.missingEngineOn[
            driverDailyLog.companyName
          ] = [driverDailyLog.driverFullName];
        }
      }

      //
      // low total Engine Hours
      if (driverEvents[i].engineMinutes < this.lowTotalEngineHoursCount()) {
        if (
          this.progressBarService.advancedResaults.lowTotalEngineHours[
            driverDailyLog.companyName
          ] &&
          !this.progressBarService.advancedResaults.lowTotalEngineHours[
            driverDailyLog.companyName
          ].includes(driverDailyLog.driverFullName)
        ) {
          this.progressBarService.advancedResaults.lowTotalEngineHours[
            driverDailyLog.companyName
          ].push(driverDailyLog.driverFullName);
        } else {
          this.progressBarService.advancedResaults.lowTotalEngineHours[
            driverDailyLog.companyName
          ] = [driverDailyLog.driverFullName];
        }
      }

      //
      // Malfunction or Data Diagnostic Detection
      if (
        driverEvents[i].eventType ===
        'MalfunctionOrDataDiagnosticDetectionOccurrence'
      ) {
        if (
          this.progressBarService.advancedResaults.malfOrDataDiagDetection[
            driverDailyLog.companyName
          ] &&
          !this.progressBarService.advancedResaults.malfOrDataDiagDetection[
            driverDailyLog.companyName
          ].includes(driverDailyLog.driverFullName)
        ) {
          this.progressBarService.advancedResaults.malfOrDataDiagDetection[
            driverDailyLog.companyName
          ].push(driverDailyLog.driverFullName);
        } else {
          this.progressBarService.advancedResaults.malfOrDataDiagDetection[
            driverDailyLog.companyName
          ] = [driverDailyLog.driverFullName];
        }
      }

      //////////////
      // Manual Driving Detection
      if (manualDrivings.length > 0) {
        const driverManualDrivings: IDriverErrorEvents = {
          name: driverDailyLog.driverFullName,
          events: manualDrivings,
        };
        if (
          this.progressBarService.advancedResaults.manualDrivingDetection[
            driverDailyLog.companyName
          ]
        ) {
          this.progressBarService.advancedResaults.manualDrivingDetection[
            driverDailyLog.companyName
          ].push(driverManualDrivings);
        } else {
          this.progressBarService.advancedResaults.manualDrivingDetection[
            driverDailyLog.companyName
          ] = [driverManualDrivings];
        }
      }

      //
      // PC/YM detection
      if (
        driverEvents[i].eventType ===
        'ChangeInDriversIndicationOfAuthorizedPersonalUseOfCmvOrYardMoves'
      ) {
        if (
          this.progressBarService.advancedResaults.pcYm[
            driverDailyLog.companyName
          ] &&
          !this.progressBarService.advancedResaults.pcYm[
            driverDailyLog.companyName
          ].includes(driverDailyLog.driverFullName)
        ) {
          this.progressBarService.advancedResaults.pcYm[
            driverDailyLog.companyName
          ].push(driverDailyLog.driverFullName);
        } else {
          this.progressBarService.advancedResaults.pcYm[
            driverDailyLog.companyName
          ] = [driverDailyLog.driverFullName];
        }
      }
    }
  }
}
