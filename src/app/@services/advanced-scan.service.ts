import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { concatMap, finalize, from, mergeMap, tap } from 'rxjs';
import { IDriver, ITenant } from '../interfaces';
import { IDailyLogs } from '../interfaces/driver-daily-log-events.interface';
import { ProgressBarService } from './progress-bar.service';
import { AppService } from './app.service';
import { ComputeEventsService } from './compute-events.service';

@Injectable({
  providedIn: 'root',
})
export class AdvancedScanService {
  private appService = inject(AppService);
  private apiService = inject(ApiService);
  private computeEventsService = inject(ComputeEventsService);
  private progressBarService = inject(ProgressBarService);

  prolongedOnDutiesDuration = signal(4200); // 1h10min
  engineHoursDuration = signal(14);
  lowTotalEngineHoursCount = signal(100);

  currentCompany = signal({} as ITenant);

  advancedScanResults = this.progressBarService.advancedResaults;

  constructor() {}

  getLogs(date: Date) {
    const tenants = this.appService.tenantsSignal();
    this.progressBarService.scanning.set(true);

    return from(tenants)
      .pipe(
        concatMap((tenant) => {
          this.currentCompany.set(tenant);
          this.progressBarService.currentCompany.set(
            this.currentCompany().name
          );

          return this.apiService.getLogs(tenant, date).pipe(
            tap(() =>
              this.progressBarService.progressValue.update(
                (prevValue) => prevValue + this.progressBarService.constant()
              )
            ),
            mergeMap((log) => from(log.items)),
            concatMap((driver) => this.dailyLogEvents$(driver, date))
          );
        })
      )
      .pipe(finalize(() => console.log(this.advancedScanResults)));
  }

  dailyLogEvents$(driver: IDriver, date: Date) {
    const tenantId = this.currentCompany().id;

    return this.apiService
      .getDriverDailyLogEvents(driver.id, date, tenantId)
      .pipe(
        tap((driverDailyLog) => {
          if (driverDailyLog.coDrivers && driverDailyLog.coDrivers[0]?.id) {
            const coId = driverDailyLog.coDrivers[0].id;

            this.apiService
              .getDriverDailyLogEvents(coId, date, tenantId)
              .subscribe({
                next: (coDriverDailyLog) =>
                  this.handleDriverDailyLogEvents({
                    driverDailyLog,
                    coDriverDailyLog,
                  }),
              });
          } else
            this.handleDriverDailyLogEvents({
              driverDailyLog,
              coDriverDailyLog: null,
            });
        })
      );
  }

  handleDriverDailyLogEvents({ driverDailyLog, coDriverDailyLog }: IDailyLogs) {
    if (!driverDailyLog) return;
    this.progressBarService.currentDriver.set(driverDailyLog.driverFullName);

    const driverEvents = driverDailyLog.events;

    let computedEvents = this.computeEventsService.getComputedEvents({
      driverDailyLog,
      coDriverDailyLog,
    });

    computedEvents.forEach((event) => {
      if (event.isTeleport) {
        const detectedTeleport = {
          driverName: driverDailyLog.driverFullName,
          id: event.eventSequenceNumber,
          event: event,
        };
        if (this.advancedScanResults.teleports[driverDailyLog.companyName]) {
          this.advancedScanResults.teleports[driverDailyLog.companyName].push(
            detectedTeleport
          );
        } else {
          this.advancedScanResults.teleports[driverDailyLog.companyName] = [
            detectedTeleport,
          ];
        }
      }
      if (event.errorMessage) {
        const eventError = {
          driverName: driverDailyLog.driverFullName,
          id: event.eventSequenceNumber,
          event: event,
        };
        if (this.advancedScanResults.eventErrors[driverDailyLog.companyName]) {
          this.advancedScanResults.eventErrors[driverDailyLog.companyName].push(
            eventError
          );
        } else {
          this.advancedScanResults.eventErrors[driverDailyLog.companyName] = [
            eventError,
          ];
        }
      }
    });

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
          this.advancedScanResults.highEngineHours[
            driverDailyLog.companyName
          ] &&
          this.advancedScanResults.highEngineHours[
            driverDailyLog.companyName
          ].find(
            (driver) => driver.driverName === driverDailyLog.driverFullName
          ) === undefined
        ) {
          this.advancedScanResults.highEngineHours[
            driverDailyLog.companyName
          ].push(highEngineHoursDriver);
        } else {
          this.advancedScanResults.highEngineHours[driverDailyLog.companyName] =
            [highEngineHoursDriver];
        }
      }

      //
      // missing Engine On
      if (driverEvents[i].isEventMissingPowerUp) {
        if (
          this.advancedScanResults.missingEngineOn[
            driverDailyLog.companyName
          ] &&
          !this.advancedScanResults.missingEngineOn[
            driverDailyLog.companyName
          ].includes(driverDailyLog.driverFullName)
        ) {
          this.advancedScanResults.missingEngineOn[
            driverDailyLog.companyName
          ].push(driverDailyLog.driverFullName);
        } else {
          this.advancedScanResults.missingEngineOn[driverDailyLog.companyName] =
            [driverDailyLog.driverFullName];
        }
      }
      //
      // low total Engine Hours
      if (driverEvents[i].engineMinutes < this.lowTotalEngineHoursCount()) {
        if (
          this.advancedScanResults.lowTotalEngineHours[
            driverDailyLog.companyName
          ] &&
          !this.advancedScanResults.lowTotalEngineHours[
            driverDailyLog.companyName
          ].includes(driverDailyLog.driverFullName)
        ) {
          this.advancedScanResults.lowTotalEngineHours[
            driverDailyLog.companyName
          ].push(driverDailyLog.driverFullName);
        } else {
          this.advancedScanResults.lowTotalEngineHours[
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
          this.advancedScanResults.malfOrDataDiagDetection[
            driverDailyLog.companyName
          ] &&
          !this.advancedScanResults.malfOrDataDiagDetection[
            driverDailyLog.companyName
          ].includes(driverDailyLog.driverFullName)
        ) {
          this.advancedScanResults.malfOrDataDiagDetection[
            driverDailyLog.companyName
          ].push(driverDailyLog.driverFullName);
        } else {
          this.advancedScanResults.malfOrDataDiagDetection[
            driverDailyLog.companyName
          ] = [driverDailyLog.driverFullName];
        }
      }
      //
      // PC/YM detection
      if (
        driverEvents[i].eventType ===
        'ChangeInDriversIndicationOfAuthorizedPersonalUseOfCmvOrYardMoves'
      ) {
        if (
          this.advancedScanResults.pcYm[driverDailyLog.companyName] &&
          !this.advancedScanResults.pcYm[driverDailyLog.companyName].includes(
            driverDailyLog.driverFullName
          )
        ) {
          this.advancedScanResults.pcYm[driverDailyLog.companyName].push(
            driverDailyLog.driverFullName
          );
        } else {
          this.advancedScanResults.pcYm[driverDailyLog.companyName] = [
            driverDailyLog.driverFullName,
          ];
        }
      }
      //
      // prolonged On Duties
      if (driverEvents[i].dutyStatus === 'ChangeToOnDutyNotDrivingStatus') {
        const duration = () => {
          // OnDuty has started and ended within same day
          if (
            driverEvents[i].realDurationInSeconds ===
            driverEvents[i].durationInSeconds
          )
            return driverEvents[i].durationInSeconds;

          // OnDuty has started on previous day and ended on current day
          if (
            driverEvents[i].realDurationInSeconds >
            driverEvents[i].durationInSeconds
          ) {
            return driverEvents[i].realDurationInSeconds;
          }
          // ongoin OnDuty has started on previous day
          else {
            const startTime = new Date(driverEvents[i].realStartTime).getTime();
            const now = new Date().getTime();

            return (now - startTime) / 1000;
          }
        };
        if (duration() > this.prolongedOnDutiesDuration()) {
          const prolongedOnDuty = {
            driverName: driverDailyLog.driverFullName,
            id: driverEvents[i].eventSequenceNumber,
            duration: duration(),
          };
          if (
            this.advancedScanResults.prolengedOnDuties[
              driverDailyLog.companyName
            ]
          ) {
            this.advancedScanResults.prolengedOnDuties[
              driverDailyLog.companyName
            ].push(prolongedOnDuty);
          } else {
            this.advancedScanResults.prolengedOnDuties[
              driverDailyLog.companyName
            ] = [prolongedOnDuty];
          }
        }
      }
    }
  }
}
