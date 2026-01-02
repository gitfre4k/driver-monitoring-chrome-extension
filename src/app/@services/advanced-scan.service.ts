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
import { IDriver, IScanResultDriver, ITenant } from '../interfaces';
import {
  IDailyLogs,
  IEvent,
} from '../interfaces/driver-daily-log-events.interface';
import { ProgressBarService } from './progress-bar.service';
import { AppService } from './app.service';
import { ComputeEventsService } from './compute-events.service';
import { DateService } from './date.service';
import { isPcOrYm } from '../helpers/app.helpers';
import { DateTime } from 'luxon';
import { ConstantsService } from './constants.service';
import { getNoSpaceNote } from '../helpers/monitor.helpers';
import { isNoteValid } from '../helpers/advanced-scan.helpers';
import { ApiOperationsService } from './api-operations.service';

@Injectable({
  providedIn: 'root',
})
export class AdvancedScanService {
  private appService = inject(AppService);
  private apiService = inject(ApiService);
  private computeEventsService = inject(ComputeEventsService);
  private progressBarService = inject(ProgressBarService);
  private dateService = inject(DateService);
  private apiOperationsService = inject(ApiOperationsService);
  constantService = inject(ConstantsService);

  httpLimit = this.constantService.httpLimit;

  ptiDuration = signal(901);
  prolongedOnDutiesDuration = signal(3600); // 1h10min
  engineHoursDuration = signal(14);
  lowTotalEngineHoursCount = signal(100);
  sleeperDuration = signal(30);

  removeEngineDuringDriving = signal(false);
  analyzedCoDrivers = signal<{ [tenantId: string]: number[] }>({});
  isReadyForSmartFix = signal(false);

  constructor() {}

  deleteEngineStatusesDuringDriving(computedEvents: IEvent[], tenant: ITenant) {
    const ids: number[] = [];
    computedEvents?.forEach((e) => {
      if (e.engineInfo?.length) {
        e.engineInfo.forEach((engine) => {
          e.nextDutyStatusInfo?.totalVehicleMiles !==
            engine.totalVehicleMiles && ids.push(engine.id);
        });
      }
    });
    ids.length &&
      this.apiOperationsService.deleteEvents(tenant, ids).subscribe({});
  }

  getDriversDailyLogs(date: string) {
    this.analyzedCoDrivers.set({});
    const tenants = this.appService.tenantsSignal();
    this.progressBarService.initializeState('advanced');
    this.progressBarService.scanning.set(true);

    return from(tenants).pipe(
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

            concatMap((log) => from(log.items)), // switchMap??
            mergeMap((driver) => {
              this.progressBarService.activeDriversCount.update((i) => i + 1);

              return this.dailyLogEvents$(
                driver,
                tenant,
                this.dateService.analyzeCustomDate(qDate),
              ).pipe(
                tap((logs) => {
                  if (
                    !logs.driverAssignedId.includes(
                      logs.vehicles[logs.vehicles.length - 1]?.name,
                    )
                  ) {
                    // driver/truck ID mismatch
                    this.progressBarService.idMismatch.update((state) => {
                      const newState = { ...state };

                      const driver = {
                        driverName: logs.driverFullName,
                        driverViewId: logs.driverAssignedId,
                        driverId: logs.driverId,
                        vehicleViewId:
                          logs.vehicles[logs.vehicles.length - 1]?.name,
                        tenant,
                      };

                      if (!newState[`${tenant.name}`])
                        newState[`${tenant.name}`] = [];

                      newState[`${tenant.name}`].push(driver);

                      return newState;
                    });
                  }

                  logs.coDrivers.length &&
                    this.analyzedCoDrivers.update((prev) => ({
                      ...prev,
                      [tenant.id]: prev[tenant.id]
                        ? [...prev[tenant.id], logs.driverId]
                        : [logs.driverId],
                    }));
                }),
              );
            }, this.httpLimit()),
            toArray(),
          );
      }),
      finalize(
        () =>
          this.removeEngineDuringDriving() && this.isReadyForSmartFix.set(true),
      ),
    );
  }

  dailyLogEvents$(driver: IDriver, tenant: ITenant, date: string) {
    return this.apiService
      .getDriverDailyLogEvents(driver.id, date, tenant.id)
      .pipe(
        tap({
          error: (error) => {
            this.progressBarService.aErrors.update((prev) => [
              ...prev,
              {
                error,
                company: tenant,
                driverName: driver.fullName,
              },
            ]);
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
                    this.progressBarService.aErrors.update((prev) => [
                      ...prev,
                      {
                        error,
                        company: tenant,
                        driverName: driver.fullName,
                      },
                    ]);
                  },
                }),
                catchError(() => of()),
              )
              .subscribe({
                next: (coDriverDailyLog) =>
                  this.handleDriverDailyLogEvents(
                    {
                      driverDailyLog,
                      coDriverDailyLog,
                    },
                    tenant,
                  ),
              });
          } else
            this.handleDriverDailyLogEvents(
              {
                driverDailyLog,
                coDriverDailyLog: null,
              },
              tenant,
            );
        }),
      );
  }

  handleDriverDailyLogEvents(
    { driverDailyLog, coDriverDailyLog }: IDailyLogs,
    tenant: ITenant,
  ) {
    if (!driverDailyLog) return;
    this.progressBarService.currentDriver.set(driverDailyLog.driverFullName);

    let computedEvents = this.computeEventsService.getComputedEvents(
      {
        driverDailyLog,
        coDriverDailyLog,
      },
      tenant,
      this.ptiDuration(),
      this.prolongedOnDutiesDuration(),
      this.sleeperDuration(),
    );

    const removeEngineDuringDriving = this.removeEngineDuringDriving();

    removeEngineDuringDriving &&
      this.deleteEngineStatusesDuringDriving(computedEvents, tenant);

    const errorEvents: IEvent[] = [];
    const warningEvents: IEvent[] = [];
    const detectedTeleportEvents: IEvent[] = [];
    const locationMismatchEvents: IEvent[] = [];
    const prolongedOnDutyEvents: IEvent[] = [];
    const manualDrivingEvents: IEvent[] = [];
    const highEngineHourEvents: IEvent[] = [];
    const missingEngineOnEvents: IEvent[] = [];
    const lowTotalEHEvents: IEvent[] = [];
    const malfEvents: IEvent[] = [];
    const pcYmEvents: IEvent[] = [];
    const newDriver: IEvent[] = [];
    const fleetManagerEvents: IEvent[] = [];
    const refuelWarning: IEvent[] = [];
    const truckChange: IEvent[] = [];
    const eventNotes: IEvent[] = [];
    const statusOverflow: IEvent[] = [];

    computedEvents.forEach((event) => {
      if (['Login', 'Logout'].includes(event.statusName)) {
        event.errorMessages.length && errorEvents.push(event);
      }

      if (event.malf) {
        malfEvents.push(event);
      }

      if (
        event.driver.id === driverDailyLog.driverId &&
        !['Login', 'Logout', 'DVIR', 'Diagnostic', 'Diag. CLR'].includes(
          event.statusName,
        )
      ) {
        if (event.eldStatusCount || event.engStatusCount)
          statusOverflow.push(event);

        if (event.isTeleport || event.dutyStatus === 'refuel') {
          detectedTeleportEvents.push(event);
        }
        if (event.locationMismatch) {
          locationMismatchEvents.push(event);
        }
        if (event.errorMessages?.length) {
          errorEvents.push(event);
        }
        if (event.warningMessages?.length) {
          warningEvents.push(event);
        }
        if (event.onDutyDuration) {
          prolongedOnDutyEvents.push(event);
        }
        if (event.manualDriving) {
          manualDrivingEvents.push(event);
        }
        if (
          event.elapsedEngineHours >= this.engineHoursDuration() &&
          event.elapsedEngineHours !== 999
        ) {
          highEngineHourEvents.push(event);
        }
        if (event.isEventMissingPowerUp) {
          missingEngineOnEvents.push(event);
        }
        if (
          event.engineMinutes < this.lowTotalEngineHoursCount() &&
          event.statusName !== 'Start Day'
        ) {
          lowTotalEHEvents.push(event);
        }
        if (
          event.origin ===
          'EditRequestedByAnAuthenticatedUserOtherThanTheDriver'
        ) {
          fleetManagerEvents.push(event);
        }
        if (isPcOrYm(event) || event.pcYmCLR) {
          pcYmEvents.push(event);
        }
        if (event.isFirstEvent || newDriver.length) {
          event.timeZone = driverDailyLog.homeTerminalTimeZone;
          newDriver.push(event);
        }
        if (event.refuel) {
          refuelWarning.push(event);
        }
        if (event.truckChange) {
          truckChange.push(event);
        }
        if (event.notes && getNoSpaceNote(event.notes)) {
          !isNoteValid(event) && eventNotes.push(event);
        }
      }
    });

    const { companyName } = driverDailyLog;
    ////////////
    // handle Prolonged On Duty events
    if (prolongedOnDutyEvents.length) {
      const driverProlongedOnDuties: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: prolongedOnDutyEvents,
      };
      this.progressBarService.prolongedOnDuty.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName])
          newValue[companyName].push(driverProlongedOnDuties);
        else newValue[companyName] = [driverProlongedOnDuties];
        return newValue;
      });
    }

    ////////////
    // handle status overflow
    if (statusOverflow.length) {
      const driverTeleportEvents: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: statusOverflow,
      };
      this.progressBarService.statusOverflow.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName])
          newValue[companyName].push(driverTeleportEvents);
        else newValue[companyName] = [driverTeleportEvents];
        return newValue;
      });
    }

    ////////////
    // handle Teleport events
    if (detectedTeleportEvents.length) {
      const driverTeleportEvents: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: detectedTeleportEvents,
      };
      this.progressBarService.teleports.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName])
          newValue[companyName].push(driverTeleportEvents);
        else newValue[companyName] = [driverTeleportEvents];
        return newValue;
      });
    }

    ////////////
    // handle Location Mismatch events
    if (locationMismatchEvents.length) {
      const locationMismatch: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: locationMismatchEvents,
      };
      this.progressBarService.locationMismatch.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName]) newValue[companyName].push(locationMismatch);
        else newValue[companyName] = [locationMismatch];
        return newValue;
      });
    }
    ////////////
    // handle Error events
    if (errorEvents.length) {
      const driverErrorEvents: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: errorEvents,
      };
      this.progressBarService.eventErrors.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName])
          newValue[companyName].push(driverErrorEvents);
        else newValue[companyName] = [driverErrorEvents];
        return newValue;
      });
    }

    ////////////
    // handle Warning events
    if (warningEvents.length) {
      const driverWarningEvents: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: warningEvents,
      };
      this.progressBarService.eventWarnings.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName])
          newValue[companyName].push(driverWarningEvents);
        else newValue[companyName] = [driverWarningEvents];
        return newValue;
      });
    }

    ///////////
    // high elapsed Engine Hours
    if (highEngineHourEvents.length) {
      const driverHighEngineHourEvents: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: highEngineHourEvents,
      };
      this.progressBarService.highEngineHours.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName])
          newValue[companyName].push(driverHighEngineHourEvents);
        else newValue[companyName] = [driverHighEngineHourEvents];
        return newValue;
      });
    }

    ////////////////
    // missing Engine On
    if (missingEngineOnEvents.length) {
      const driverMissingEngineOn: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: missingEngineOnEvents,
      };
      this.progressBarService.missingEngineOn.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName])
          newValue[companyName].push(driverMissingEngineOn);
        else newValue[companyName] = [driverMissingEngineOn];
        return newValue;
      });
    }

    ///////////////
    // low total Engine Hours
    if (lowTotalEHEvents.length) {
      const driverLowTotalEH: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: lowTotalEHEvents,
      };
      this.progressBarService.lowTotalEngineHours.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName]) newValue[companyName].push(driverLowTotalEH);
        else newValue[companyName] = [driverLowTotalEH];
        return newValue;
      });
    }

    //////////////
    // Malfunction or Data Diagnostic Detection
    if (malfEvents.length) {
      const driverMalf: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: malfEvents,
      };
      this.progressBarService.malfOrDataDiag.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName]) newValue[companyName].push(driverMalf);
        else newValue[companyName] = [driverMalf];
        return newValue;
      });
    }

    //////////////
    // Refuel Warning Events
    if (refuelWarning.length) {
      const refuelWarningDriver: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: refuelWarning,
      };
      this.progressBarService.refuelWarning.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName])
          newValue[companyName].push(refuelWarningDriver);
        else newValue[companyName] = [refuelWarningDriver];
        return newValue;
      });
    }

    //////////////
    // Manual Driving Detection
    if (manualDrivingEvents.length) {
      const driverManualDriving: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: manualDrivingEvents,
      };
      this.progressBarService.manualDriving.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName])
          newValue[companyName].push(driverManualDriving);
        else newValue[companyName] = [driverManualDriving];
        return newValue;
      });
    }

    //////////////
    // PC/YM detection
    if (pcYmEvents.length) {
      const driverPcYm: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: pcYmEvents,
      };
      this.progressBarService.pcYm.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName]) newValue[companyName].push(driverPcYm);
        else newValue[companyName] = [driverPcYm];
        return newValue;
      });
    }

    //////////////
    // fleetManager
    if (fleetManagerEvents.length) {
      const fleetManager: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: fleetManagerEvents,
      };
      this.progressBarService.fleetManager.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName]) newValue[companyName].push(fleetManager);
        else newValue[companyName] = [fleetManager];
        return newValue;
      });
    }

    //////////////
    // New Driver
    if (newDriver.length) {
      const newDriverEvent: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: newDriver,
      };
      this.progressBarService.newDrivers.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName]) newValue[companyName].push(newDriverEvent);
        else newValue[companyName] = [newDriverEvent];
        return newValue;
      });
    }

    //////////////
    // truck change
    if (truckChange.length) {
      const truckChangeDrivers: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: truckChange,
      };
      this.progressBarService.truckChange.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName])
          newValue[companyName].push(truckChangeDrivers);
        else newValue[companyName] = [truckChangeDrivers];
        return newValue;
      });
    }

    //////////////
    // event notes
    if (eventNotes.length) {
      const driversEventNotes: IScanResultDriver = {
        driverName: driverDailyLog.driverFullName,
        events: eventNotes,
      };
      this.progressBarService.eventNotes.update((prev) => {
        const newValue = { ...prev };
        if (newValue[companyName])
          newValue[companyName].push(driversEventNotes);
        else newValue[companyName] = [driversEventNotes];
        return newValue;
      });
    }
  }
}
