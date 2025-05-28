import { inject, Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { concatMap, from, mergeMap, skip, take, tap } from 'rxjs';
import { IDetectedTeleports, IDriver, ITenant } from '../interfaces';
import { IEvent } from '../interfaces/driver-daily-log-events.interface';
import { IDriverDailyLogEvents } from '../interfaces/driver-daily-log-events.interface';
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
        // skip(30)
        // take(15)
      )
    );
  };

  dailyLogEvents$(driver: IDriver, date: Date) {
    return this.apiService
      .getDriverDailyLogEvents(
        driver.id,
        date, // new Date('2025-05-22T05:00:00.000Z')
        this.currentCompany().id
      )

      .pipe(
        tap((driverDailyLogs) =>
          this.handleDriverDailyLogEvents(driverDailyLogs)
        )
      );
  }

  handleDriverDailyLogEvents(driverDailyLogs: IDriverDailyLogEvents) {
    this.progressBarService.currentDriver.set(driverDailyLogs.driverFullName);
    let events = driverDailyLogs.events;

    //
    // teleport and event errors
    let computedEvents = [...events];
    computedEvents = bindEventViewId(computedEvents);
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
        if (this.advancedScanResults.teleports[driverDailyLogs.companyName]) {
          this.advancedScanResults.teleports[driverDailyLogs.companyName].push(
            eventError
          );
        } else {
          this.advancedScanResults.teleports[driverDailyLogs.companyName] = [
            eventError,
          ];
        }
      }
    });

    for (let i = 0; i < events.length; i++) {
      //
      // high elapsed Engine Hours
      if (events[i].elapsedEngineHours >= this.engineHoursDuration()) {
        const highEngineHoursDriver = {
          driverName: driverDailyLogs.driverFullName,
          id: events[i].eventSequenceNumber,
          duration: events[i].elapsedEngineHours,
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
      if (events[i].isEventMissingPowerUp) {
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
      if (events[i].engineMinutes < this.lowTotalEngineHoursCount()) {
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
        events[i].eventType === 'MalfunctionOrDataDiagnosticDetectionOccurrence'
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
        events[i].eventType ===
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
      if (events[i].dutyStatus === 'ChangeToOnDutyNotDrivingStatus') {
        const duration = () => {
          // OnDuty has started and ended within same day
          if (events[i].realDurationInSeconds === events[i].durationInSeconds)
            return events[i].durationInSeconds;

          // OnDuty has started on previous day and ended on current day
          if (events[i].realDurationInSeconds > events[i].durationInSeconds) {
            return events[i].realDurationInSeconds;
          }
          // ongoin OnDuty has started on previous day
          else {
            const startTime = new Date(events[i].realStartTime).getTime();
            const now = new Date().getTime();

            return (now - startTime) / 1000;
          }
        };
        if (duration() > this.prolongedOnDutiesDuration()) {
          const prolongedOnDuty = {
            driverName: driverDailyLogs.driverFullName,
            id: events[i].eventSequenceNumber,
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
