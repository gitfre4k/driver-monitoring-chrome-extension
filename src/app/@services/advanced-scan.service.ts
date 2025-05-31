import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { concatMap, from, mergeMap, take, tap } from 'rxjs';
import { IDriver, ITenant } from '../interfaces';
import {
  IDriverDailyLogEvents,
  IEvent,
} from '../interfaces/driver-daily-log-events.interface';
import { ProgressBarService } from './progress-bar.service';
import {
  bindEventViewId,
  computeEvents,
  detectAndBindTeleport,
  filterEvents,
} from '../helpers/monitor.helpers';

@Injectable({
  providedIn: 'root',
})
export class AdvancedScanService {
  private apiService: ApiService = inject(ApiService);
  private progressBarService = inject(ProgressBarService);

  prolongedOnDutiesDuration = signal(4200); // 1h10min
  engineHoursDuration = signal(14);
  lowTotalEngineHoursCount = signal(100);

  currentCompany = signal({} as ITenant);
  advancedScanResults = this.progressBarService.advancedResaults;

  constructor() {}

  allTetants$ = () => {
    return this.apiService.getAccessibleTenants().pipe(
      tap((tenants) => {
        this.progressBarService.constant.set(100 / tenants.length);
      }),
      mergeMap(
        (tenant) => from(tenant).pipe()
        //
      )
    );
  };

  dailyLogEvents$(driver: IDriver, date: Date) {
    const tenantId = this.currentCompany().id;
    let coDriverDailyLogs: IDriverDailyLogEvents;

    return this.apiService
      .getDriverDailyLogEvents(driver.id, date, tenantId)
      .pipe(
        tap((driverDailyLogs) => {
          // check for co driver
          if (driverDailyLogs.coDrivers[0] && driverDailyLogs.coDrivers[0].id) {
            this.apiService
              .getDriverDailyLogEvents(
                driverDailyLogs.coDrivers[0].id,
                date,
                tenantId
              )
              .subscribe({
                next: (logs) => {
                  coDriverDailyLogs = logs;
                },
              });
          }

          console.log(
            'coDriverDailyLogscoDriverDailyLogscoDriverDailyLogscoDriverDailyLogs',
            coDriverDailyLogs
          );

          return coDriverDailyLogs
            ? this.handleDriverDailyLogEvents(
                driverDailyLogs,
                coDriverDailyLogs
              )
            : this.handleDriverDailyLogEvents(driverDailyLogs);
        })
      );
  }

  handleDriverDailyLogEvents(
    driverDailyLogs: IDriverDailyLogEvents,
    coDriverDailyLogs?: IDriverDailyLogEvents
  ) {
    this.progressBarService.currentDriver.set(driverDailyLogs.driverFullName);

    let driverEvents = driverDailyLogs.events;
    let coDriverEvents = coDriverDailyLogs && coDriverDailyLogs.events;

    bindEventViewId(driverEvents);
    coDriverEvents && bindEventViewId(coDriverEvents);

    let events = [] as IEvent[];

    if (coDriverDailyLogs && coDriverEvents && coDriverEvents.length > 0) {
      driverEvents.forEach(
        (e) =>
          (e.driver = {
            id: driverDailyLogs.driverId,
            name: driverDailyLogs.driverFullName,
          })
      );
      coDriverEvents.forEach(
        (e) =>
          (e.driver = {
            id: coDriverDailyLogs.driverId,
            name: coDriverDailyLogs.driverFullName,
          })
      );
      events = [...driverEvents, ...coDriverEvents].sort(
        (a, b) =>
          new Date(a.realStartTime).getTime() -
          new Date(b.realStartTime).getTime()
      );
    } else {
      events = [...driverEvents];
    }

    //
    // teleport and event errors
    let computedEvents = [...events];
    computedEvents = computedEvents.filter((event) => filterEvents(event));
    computedEvents = computeEvents(computedEvents);
    computedEvents = detectAndBindTeleport(computedEvents);

    computedEvents.forEach((event) => {
      if (event.isTeleport) {
        const detectedTeleport = {
          driverName: driverDailyLogs.driverFullName,
          id: event.eventSequenceNumber,
          event: event,
        };
        if (this.advancedScanResults.teleports[driverDailyLogs.companyName]) {
          this.advancedScanResults.teleports[driverDailyLogs.companyName].push(
            detectedTeleport
          );
        } else {
          this.advancedScanResults.teleports[driverDailyLogs.companyName] = [
            detectedTeleport,
          ];
        }
      }
      if (event.errorMessage) {
        const eventError = {
          driverName: driverDailyLogs.driverFullName,
          id: event.eventSequenceNumber,
          event: event,
        };
        if (this.advancedScanResults.eventErrors[driverDailyLogs.companyName]) {
          this.advancedScanResults.eventErrors[
            driverDailyLogs.companyName
          ].push(eventError);
        } else {
          this.advancedScanResults.eventErrors[driverDailyLogs.companyName] = [
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
          driverName: driverDailyLogs.driverFullName,
          id: driverEvents[i].eventSequenceNumber,
          duration: driverEvents[i].elapsedEngineHours,
        };
        if (
          this.advancedScanResults.highEngineHours[
            driverDailyLogs.companyName
          ] &&
          this.advancedScanResults.highEngineHours[
            driverDailyLogs.companyName
          ].find(
            (driver) => driver.driverName === driverDailyLogs.driverFullName
          ) === undefined
        ) {
          this.advancedScanResults.highEngineHours[
            driverDailyLogs.companyName
          ].push(highEngineHoursDriver);
        } else {
          this.advancedScanResults.highEngineHours[
            driverDailyLogs.companyName
          ] = [highEngineHoursDriver];
        }
      }

      //
      // missing Engine On
      if (driverEvents[i].isEventMissingPowerUp) {
        if (
          this.advancedScanResults.missingEngineOn[
            driverDailyLogs.companyName
          ] &&
          !this.advancedScanResults.missingEngineOn[
            driverDailyLogs.companyName
          ].includes(driverDailyLogs.driverFullName)
        ) {
          this.advancedScanResults.missingEngineOn[
            driverDailyLogs.companyName
          ].push(driverDailyLogs.driverFullName);
        } else {
          this.advancedScanResults.missingEngineOn[
            driverDailyLogs.companyName
          ] = [driverDailyLogs.driverFullName];
        }
      }
      //
      // low total Engine Hours
      if (driverEvents[i].engineMinutes < this.lowTotalEngineHoursCount()) {
        if (
          this.advancedScanResults.lowTotalEngineHours[
            driverDailyLogs.companyName
          ] &&
          !this.advancedScanResults.lowTotalEngineHours[
            driverDailyLogs.companyName
          ].includes(driverDailyLogs.driverFullName)
        ) {
          this.advancedScanResults.lowTotalEngineHours[
            driverDailyLogs.companyName
          ].push(driverDailyLogs.driverFullName);
        } else {
          this.advancedScanResults.lowTotalEngineHours[
            driverDailyLogs.companyName
          ] = [driverDailyLogs.driverFullName];
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
            driverDailyLogs.companyName
          ] &&
          !this.advancedScanResults.malfOrDataDiagDetection[
            driverDailyLogs.companyName
          ].includes(driverDailyLogs.driverFullName)
        ) {
          this.advancedScanResults.malfOrDataDiagDetection[
            driverDailyLogs.companyName
          ].push(driverDailyLogs.driverFullName);
        } else {
          this.advancedScanResults.malfOrDataDiagDetection[
            driverDailyLogs.companyName
          ] = [driverDailyLogs.driverFullName];
        }
      }
      //
      // PC/YM detection
      if (
        driverEvents[i].eventType ===
        'ChangeInDriversIndicationOfAuthorizedPersonalUseOfCmvOrYardMoves'
      ) {
        if (
          this.advancedScanResults.pcYm[driverDailyLogs.companyName] &&
          !this.advancedScanResults.pcYm[driverDailyLogs.companyName].includes(
            driverDailyLogs.driverFullName
          )
        ) {
          this.advancedScanResults.pcYm[driverDailyLogs.companyName].push(
            driverDailyLogs.driverFullName
          );
        } else {
          this.advancedScanResults.pcYm[driverDailyLogs.companyName] = [
            driverDailyLogs.driverFullName,
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
            driverName: driverDailyLogs.driverFullName,
            id: driverEvents[i].eventSequenceNumber,
            duration: duration(),
          };
          if (
            this.advancedScanResults.prolengedOnDuties[
              driverDailyLogs.companyName
            ]
          ) {
            this.advancedScanResults.prolengedOnDuties[
              driverDailyLogs.companyName
            ].push(prolongedOnDuty);
          } else {
            this.advancedScanResults.prolengedOnDuties[
              driverDailyLogs.companyName
            ] = [prolongedOnDuty];
          }
        }
      }
    }
  }

  getLogs(date: Date) {
    this.progressBarService.scanning.set(true);
    return this.allTetants$().pipe(
      concatMap((tenant) => {
        this.currentCompany.set(tenant);
        this.progressBarService.currentCompany.set(this.currentCompany().name);

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
    );
  }
}
