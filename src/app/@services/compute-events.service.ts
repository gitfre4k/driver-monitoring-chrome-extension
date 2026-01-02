import { inject, Injectable, signal } from '@angular/core';

import {
  bindEventViewId,
  filterEvents,
  getStatusDuration,
  getStatusName,
  isDriving,
  isDutyStatus,
  isIntermediate,
  isPc,
} from '../helpers/app.helpers';

import {
  IDailyLogs,
  IDriverIdAndName,
  IDriverState,
  IEvent,
  IRefuels,
  IStatusInfo,
} from '../interfaces/driver-daily-log-events.interface';
import { ITenant } from '../interfaces';
import { ApiService } from './api.service';
import { DateTime } from 'luxon';
import { isEventLocked } from '../helpers/compute-events.helpers';

@Injectable({
  providedIn: 'root',
})
export class ComputeEventsService {
  apiService = inject(ApiService);

  speeding = signal(79.99);

  initialDriverState: IDriverState = {
    currentDriving: null,
    currentDrivingIntermediates: [],
    intermediateCount: 0,
    currentDutyStatus: {} as IEvent,
    occurredDuringDriving: false,
    shiftIsReadyToStart: false,
    coDriverLastBreakStatus: null,
    break: {
      shift: '',
      cycle: '',
    },
  };
  driverState = signal(this.initialDriverState);
  coDriverState = signal(this.initialDriverState);
  refuelMarker = signal<IRefuels | null>(null);

  constructor() {}

  getComputedEvents = (
    { driverDailyLog, coDriverDailyLog }: IDailyLogs,
    tenant?: ITenant,
    ptiDuration?: number,
    prolongedOnDutiesDuration?: number,
    sleeperMinDuration?: number,
  ) => {
    if (!driverDailyLog) return [];

    //////////////////////////
    // initialize state
    ////// driver
    this.refuelMarker.set(null);
    this.driverState.set(this.initialDriverState);
    driverDailyLog.shiftBreak &&
      this.driverState.update((prev) => ({
        ...prev,
        break: { ...prev.break, shift: driverDailyLog.shiftBreak },
      }));
    driverDailyLog.cycleBreak &&
      this.driverState.update((prev) => ({
        ...prev,
        break: { ...prev.break, cycle: driverDailyLog.cycleBreak },
      }));
    //////////////////////////
    // initialize state
    ////// coDriver
    this.coDriverState.set(this.initialDriverState);
    coDriverDailyLog?.shiftBreak &&
      this.coDriverState.update((prev) => ({
        ...prev,
        break: { ...prev.break, shift: coDriverDailyLog.shiftBreak },
      }));
    coDriverDailyLog?.cycleBreak &&
      this.coDriverState.update((prev) => ({
        ...prev,
        break: { ...prev.break, cycle: coDriverDailyLog.cycleBreak },
      }));
    /////////////////////
    let events = [] as IEvent[];
    let driverEvents = bindEventViewId(driverDailyLog.events);
    let coDriverEvents = coDriverDailyLog
      ? bindEventViewId(coDriverDailyLog.events)
      : null;

    let eldStatusCount = 0;
    let engStatusCount = 0;
    driverEvents.forEach((e) => {
      ['EldDisconnected', 'EldConnected'].includes(e.dutyStatus) &&
        eldStatusCount++;
      e.dutyStatus.includes('Engine') && engStatusCount++;

      e.driver = {
        id: driverDailyLog.driverId,
        viewId: driverDailyLog.driverId,
        name: driverDailyLog.driverFullName,
      };
      e.isLocked = isEventLocked(e, driverDailyLog.driverFmcsaInspection);
    });
    if (coDriverDailyLog && coDriverEvents && coDriverEvents?.length > 0) {
      coDriverEvents.forEach((e) => {
        e.driver = {
          id: coDriverDailyLog.driverId,
          viewId: driverDailyLog.driverId,
          name: coDriverDailyLog.driverFullName,
        };
        e.isLocked = isEventLocked(e, coDriverDailyLog.driverFmcsaInspection);
      });
      events = [...driverEvents, ...coDriverEvents].sort(
        (a, b) =>
          new Date(a.realStartTime).getTime() -
          new Date(b.realStartTime).getTime(),
      );
    } else events = [...driverEvents];

    const filteredEvents = [...events].filter((event) => !filterEvents(event));
    events = events.filter((event) => filterEvents(event));
    //
    // add latest Refuel
    if (driverDailyLog.refuels.length) {
      const refuel = driverDailyLog.refuels.reduce((latest, current) => {
        return latest.time > current.time ? latest : current;
      });
      this.refuelMarker.set(refuel);
    }

    eldStatusCount > 40 && (events[0].eldStatusCount = eldStatusCount);
    engStatusCount > 40 && (events[0].engStatusCount = engStatusCount);

    events = this.computeEvents(
      events,
      ptiDuration,
      prolongedOnDutiesDuration,
      sleeperMinDuration,
      driverDailyLog.date,
      tenant,
    );
    events = this.detectAndBindTeleport(events);

    //////////////
    // Custom events
    filteredEvents.forEach((e) => {
      e.date = driverDailyLog.date;
      e.errorMessages = [];
      tenant && (e.tenant = tenant);
      // PC/YM DriverIndicationClear
      if (e.dutyStatus === 'DriverIndicationClear') {
        e.pcYmCLR = true;
        e.statusName = 'PC/YM CLR';
        events.push(e);
      }
      // 2nd PC/YM event
      if (
        e.eventType ===
        'ChangeInDriversIndicationOfAuthorizedPersonalUseOfCmvOrYardMoves'
      ) {
        if (e.dutyStatus === 'DriverIndicationAuthorizedPersonalUseCmv') {
          e.statusName = 'PC (2nd)';
          events.push(e);
        }
        if (e.dutyStatus === 'DriverIndicationYardMoves') {
          e.statusName = 'YM (2nd)';
          events.push(e);
        }
      }
      // malf or data diag
      if (e.eventType === 'MalfunctionOrDataDiagnosticDetectionOccurrence') {
        e.malf = true;
        e.dutyStatus === 'DataDiagnostic' && (e.statusName = 'Diagnostic');
        e.dutyStatus === 'DataDiagnosticClear' && (e.statusName = 'Diag. CLR');
        e.dutyStatus === 'DataDiagnostic-E' && (e.statusName = 'Diag. CLR (E)');
        e.dutyStatus === 'EldMalfunction' && (e.statusName = 'ELD Malf.');
        e.dutyStatus === 'EldMalfunctionClear' && (e.statusName = 'Malf. CLR');
        events.push(e);
      }
      // login/logout
      if (e.eventType === 'DriversLoginOrLogoutActivity') {
        if (e.dutyStatus === 'AuthenticatedDriverLogin') e.statusName = 'Login';
        else e.statusName = 'Logout';
        events.push(e);
      }
      // DVIR
      if (e.dutyStatus === 'Dvir') {
        e.statusName = 'DVIR';
        events.push(e);
      }
    });

    events.sort(
      (a, b) =>
        new Date(a.realStartTime).getTime() -
        new Date(b.realStartTime).getTime(),
    );

    let currentDriver = {} as IDriverIdAndName;

    for (let i = 0; i < events.length; i++) {
      // change currentDriver and add shift breakpoint to event
      if (events[i].driver?.id !== currentDriver.id) {
        currentDriver = events[i].driver;
        events[i].shift = true;
      }
    }

    // filter driver events
    const currentDriverEvents = events.filter(
      (ev) => ev.driver.id === ev.driver.viewId,
    );
    for (let i = 0; i < currentDriverEvents.length; i++) {
      // check if new drivers's first event is Login
      if (currentDriverEvents[i].isFirstEvent) {
        if (
          currentDriverEvents[i + 1] &&
          currentDriverEvents[i + 1].statusName !== 'Login'
        ) {
          const index = events.findIndex(
            (ev) => ev.id === currentDriverEvents[i + 1].id,
          );

          index !== -1 &&
            events[index].errorMessages.push('occured before Login event');
        }
      }

      // event occured before login
      if (currentDriverEvents[i].statusName === 'Login' && i > 1) {
        const prevEvent = currentDriverEvents[i - 1];
        if (prevEvent && !['Login', 'Logout'].includes(prevEvent.statusName)) {
          const index = events.findIndex((ev) => ev.id === prevEvent.id);
          events[index].errorMessages.push(
            'occured before Login / missing Logout',
          );
        }
      }
      // missing Login event
      if (currentDriverEvents[i].statusName === 'Logout') {
        const nextEvent = currentDriverEvents[i + 1];
        if (nextEvent && nextEvent.statusName !== 'Login') {
          const index = events.findIndex((ev) => ev.id === nextEvent.id);
          events[index].errorMessages.push('missing Login event');
        }
      }
    }

    return events;
  };

  computeEvents = (
    importedEvents: IEvent[],
    ptiDuration?: number,
    prolongedOnDutiesDuration?: number,
    sleeperMinDuration?: number,
    date?: string,
    tenant?: ITenant,
  ) => {
    let events = [...importedEvents];
    let currentDriver = {} as IDriverIdAndName;
    let wannabePTIonDutyId = 0;

    if (events.length === 1 && events[0].durationInSeconds < 0) return [];

    ////////////////////
    // compute events
    for (let i = 0; i < events.length; i++) {
      // if (events[i].custom) continue;
      let {
        currentDriving,
        currentDrivingIntermediates,
        intermediateCount,
        currentDutyStatus,
        occurredDuringDriving,
        shiftIsReadyToStart,
        coDriverLastBreakStatus,
        break: { shift, cycle },
      } = events[i].driver.viewId === events[i].driver.id
        ? this.driverState()
        : this.coDriverState();
      events[i].computeIndex = i;
      events[i].errorMessages = [];
      events[i].warningMessages = [];
      events[i].statusName = getStatusName(events[i].dutyStatus);
      events[i].occurredDuringDriving = occurredDuringDriving;
      date && (events[i].date = date);
      tenant && (events[i].tenant = tenant);

      // inactive events
      if (
        events[i].eventRecordStatus &&
        events[i].eventRecordStatus !== 'Active'
      ) {
        let warningMessage = '';
        switch (events[i].eventRecordStatus) {
          case 'InactiveChangeRejected':
            warningMessage = 'Inactive Event: Change Rejected';
            break;
          case 'InactiveChangeRequest':
            warningMessage = 'Inactive Event: Change Request';
            break;
          case 'InactiveChanged':
            warningMessage = 'Inactive Event: Changed';
            break;
        }
        warningMessage && events[i].warningMessages.push(warningMessage);
      }

      // missing engine on event
      events[i].isEventMissingPowerUp &&
        events[i].warningMessages.push('Missing Engine On event');

      // fleet manager
      events[i].origin ===
        'EditRequestedByAnAuthenticatedUserOtherThanTheDriver' &&
        (events[i].statusName = 'Fleet manager');

      // auto-assumed events
      events[i].origin === 'AssumedFromUnidentifiedDriverProfile' &&
        events[i].errorMessages.push('Origin: Auto-assumed');

      // assign end of shift for current driver
      if (events[i].driver?.id !== currentDriver.id) {
        currentDriver = events[i].driver;
        // if (i !== 0) coDriverLastBreakStatus = events[i - 1].break;
      }

      // coDriverLastBreakStatus
      events[i].coDriverLastBreakStatus = coDriverLastBreakStatus;

      // onDuty, origin: Auto
      if (
        events[i].viewId !== 1 &&
        events[i].statusName === 'On Duty' &&
        events[i].origin === 'AutomaticallyRecordedByEld' &&
        !isDriving(currentDutyStatus)
      )
        events[i].errorMessages.push(
          '[origin: Auto]' +
            (currentDutyStatus.statusName
              ? ' after ' + currentDutyStatus.statusName
              : ''),
        );

      ///////////////
      // detect 10h/34h break
      const marker10Hours = new Date(shift).getTime();
      const marker34Hours = new Date(cycle).getTime();
      const eventStartTime = new Date(
        events[i].realStartTime ? events[i].realStartTime : events[i].startTime,
      ).getTime();
      const eventEndTime = new Date(
        events[i].realEndTime ? events[i].realEndTime : events[i].endTime,
      ).getTime();
      /////////////////////////////// 10h break ///////////////////////////////
      if (['Sleeper Berth', 'Off Duty'].includes(events[i].statusName)) {
        getStatusDuration(events[i]) / 60 / 60 > 10 && (events[i].break = 10);
      }
      if (marker10Hours > eventStartTime && marker10Hours < eventEndTime) {
        events[i].break = 10;
      }
      /////////////////////////////// 34h break ///////////////////////////////
      if (['Sleeper Berth', 'Off Duty'].includes(events[i].statusName)) {
        getStatusDuration(events[i]) / 60 / 60 > 34 && (events[i].break = 34);
      }
      if (
        (marker34Hours > eventStartTime && marker34Hours < eventEndTime) ||
        events[i].isFirstEvent
      ) {
        events[i].break = 34;
      }

      ///////////////////
      // assign duty status and double duty check
      if (isDutyStatus(events[i])) {
        if (currentDutyStatus.id) {
          currentDutyStatus.driver?.id === events[i].driver?.id && // exclude co drivers events
            (currentDutyStatus.statusName === events[i].statusName
              ? events[i].errorMessages.push('double Duty status')
              : (currentDutyStatus = events[i]));
        } else currentDutyStatus = events[i];
      }

      /////////////////
      // passing parent duty status
      events[i].id === currentDutyStatus.id
        ? ''
        : (events[i].parentClass =
            'parent-' + currentDutyStatus?.statusName?.replace(/\s/g, ''));

      ////////////////////////////// mark break //////////////////////////////
      events[i].break = currentDutyStatus?.break ? currentDutyStatus.break : 0;

      ////////////////////
      // is shift ready to start ??
      if (
        // case 34 break or 10h+ Sleeper/Off
        ['Sleeper Berth', 'Off Duty'].includes(currentDutyStatus.statusName) &&
        getStatusDuration(currentDutyStatus) / 60 / 60 > 10
      ) {
        shiftIsReadyToStart = true;
      }

      const timeSinceShiftResetOccured = new Date().getTime() - marker10Hours; // miliseconds
      const timeSinceCycleResetOccured = new Date().getTime() - marker34Hours; // miliseconds
      const timeSinceEventOccured =
        new Date().getTime() -
        new Date(
          events[i].realStartTime
            ? events[i].realStartTime
            : events[i].startTime,
        ).getTime(); // miliseconds
      if (
        (timeSinceShiftResetOccured > timeSinceEventOccured ||
          timeSinceCycleResetOccured > timeSinceEventOccured ||
          shiftIsReadyToStart) &&
        events[i].eventType !== 'CmvEnginePowerUpOrShutDownActivity' &&
        events[i].dutyStatus !== 'DriverIndicationAuthorizedPersonalUseCmv'
      ) {
        if (
          events[i].statusName === 'On Duty' &&
          events[i].realDurationInSeconds !== 0
        ) {
          // PTI duration validity
          if (events[i].realDurationInSeconds >= 781) {
            timeSinceShiftResetOccured > timeSinceEventOccured && (shift = '');
            timeSinceCycleResetOccured > timeSinceEventOccured && (cycle = '');
            shiftIsReadyToStart = false;
            wannabePTIonDutyId = 0;
            events[i].pti = -9999;
            if (!events[i].notes || events[i].notes.trim() === '')
              events[i].warningMessages.push('[PTI] missing note');
            // if (invalidPTINote(events[i].notes)) events[i].errorMessages.push('[PTI] wrong note')

            // console.log('[Pre-Trip Inspection validity] valid PTI detected');
          } else {
            wannabePTIonDutyId = i;

            // console.log('[Pre-Trip Inspection validity] short PTI detected');
          }
        }
        // no PTI
        if (events[i].statusName === 'Driving') {
          if (wannabePTIonDutyId) {
            events[wannabePTIonDutyId].pti =
              901 - events[wannabePTIonDutyId].realDurationInSeconds;
            events[wannabePTIonDutyId].warningMessages.push(
              'short Pre-Trip Inspection',
            );
          } else {
            events[i].pti = 0;
            events[i].errorMessages.push('no Pre-Trip Inspection');
          }

          timeSinceShiftResetOccured > timeSinceEventOccured && (shift = '');
          timeSinceCycleResetOccured > timeSinceEventOccured && (cycle = '');
          shiftIsReadyToStart = false;
          wannabePTIonDutyId = 0;
        }
      }

      ////////////////////
      // prolonged On Duties
      if (events[i].dutyStatus === 'ChangeToOnDutyNotDrivingStatus') {
        const duration = getStatusDuration(events[i]);
        if (
          duration >
          (prolongedOnDutiesDuration ? prolongedOnDutiesDuration : 901)
        ) {
          events[i].onDutyDuration = duration;
        }
      }

      ////////////////////
      // 34 hours break in Sleeper Berth
      if (events[i].statusName === 'Sleeper Berth') {
        if (!events[i].realDurationInSeconds) {
          const sleeperDuration =
            (new Date().getTime() -
              new Date(events[i].realStartTime).getTime()) /
            1000 /
            60 /
            60;
          sleeperDuration > (sleeperMinDuration ? sleeperMinDuration : 30) &&
            events[i].warningMessages.push('34hr break outside Off Duty');
        } else {
          events[i].realDurationInSeconds / 60 / 60 >
            (sleeperMinDuration ? sleeperMinDuration : 30) &&
            events[i].warningMessages.push('34hr break outside Off Duty');
        }
      }

      ////////////////////
      // check for Manual Drivings
      if (
        events[i].dutyStatus === 'ChangeToDrivingStatus' &&
        events[i].origin === 'EditedOrEnteredByTheDriver'
      ) {
        events[i].manualDriving = true;
      }

      ////////////////////
      // checking for intermediate validity
      if (isDriving(events[i])) {
        occurredDuringDriving = true;
        currentDriving = events[i];
        events[i].engineInfo = [];

        // speeding warning for Driving less then 1h long
        if (events[i].averageSpeed && events[i].averageSpeed > 75) {
          events[i].warningMessages.push(
            `speeding [${events[i].averageSpeed.toFixed()} mph]`,
          );
        }
      }

      if (isIntermediate(events[i])) {
        intermediateCount++;
        currentDrivingIntermediates.push(events[i]);
        if (!currentDriving) {
          events[i].errorMessages.push('outside driving scope');
        } else {
          //////////////
          // intermediate location and odometer check
          const currentDrivingPlusIntermediates = [
            currentDriving,
            ...currentDrivingIntermediates,
          ];
          const prevEvent =
            currentDrivingPlusIntermediates[
              currentDrivingPlusIntermediates.length - 2
            ];

          if (
            prevEvent.odometer === events[i].odometer &&
            prevEvent.locationDisplayName === events[i].locationDisplayName
          )
            events[i].errorMessages.push('location and odometer unchanged');
          else {
            prevEvent.odometer === events[i].odometer &&
              events[i].errorMessages.push('odometer unchanged');
            prevEvent.locationDisplayName === events[i].locationDisplayName &&
              events[i].errorMessages.push('location unchanged');
          }

          ////////////////////////////////////////////////////////

          let diff =
            +new Date(events[i].realStartTime) -
            +new Date(currentDriving.realStartTime);
          let remainder = diff % (3600 * 1000);
          !(3600 * 1000 - remainder <= 1000 || remainder <= 1000) &&
            events[i].errorMessages.push('incorrect timestamp');
        }
      }
      if (
        [
          'ChangeToOffDutyStatus',
          'ChangeToSleeperBerthStatus',
          'ChangeToOnDutyNotDrivingStatus',
        ].includes(events[i].dutyStatus) ||
        (i === events.length - 1 && currentDriving)
      ) {
        if (currentDriving !== null) {
          // case when driving has started within same day
          if (
            currentDriving.realStartTime === currentDriving.startTime &&
            currentDriving
          ) {
            Math.floor((currentDriving.durationInSeconds - 1) / 3600) !== // -1sec
              intermediateCount &&
              events[currentDriving.computeIndex].errorMessages.push(
                'incorrect intermediate count',
              );
          }

          // case when driving has started on previous day
          if (
            currentDriving.realDurationInSeconds >
              currentDriving.durationInSeconds &&
            currentDriving.realStartTime !== currentDriving.startTime
          ) {
            let totalIntermediateCount = Math.floor(
              (currentDriving.realDurationInSeconds - 1) / 3600, // -1sec
            );
            let previousDayIntermediateCount = Math.floor(
              (currentDriving.realDurationInSeconds -
                currentDriving.durationInSeconds) /
                3600,
            );

            totalIntermediateCount - previousDayIntermediateCount !==
              intermediateCount &&
              events[currentDriving.computeIndex].errorMessages.push(
                'incorrect intermediate count',
              );
          }

          //
          // case when ongoing driving that has started on previous day
          if (
            currentDriving.realDurationInSeconds === 0 &&
            currentDriving.startTime !== currentDriving.realStartTime
          ) {
            const startTime = new Date(currentDriving.realStartTime).getTime();
            const now = new Date().getTime();

            const durationInSeconds = (now - startTime) / 1000 - 1; // -1

            const totalIntermediateCount = Math.floor(durationInSeconds / 3600);

            const previousDayIntermediateCount = Math.floor(
              (durationInSeconds - currentDriving.durationInSeconds) / 3600,
            );

            totalIntermediateCount - previousDayIntermediateCount !==
              intermediateCount &&
              events[currentDriving.computeIndex].errorMessages.push(
                'incorrect intermediate count',
              );
          }

          //
          // speeding
          const arr = [currentDriving, ...currentDrivingIntermediates];
          for (let index = 0; index < arr.length - 1; index++) {
            if (arr[index].viewId === 1) continue;

            const speed = +(
              arr[index + 1].odometer - arr[index].odometer
            ).toFixed(2);
            events[arr[index + 1].computeIndex].averageSpeed = speed;
            speed > this.speeding() &&
              events[arr[index + 1].computeIndex].warningMessages.push(
                `speeding [${speed} mph]`,
              );
          }
          // last inter to next duty status
          const distance = events[i].odometer - arr.at(-1)!.odometer;
          const minutes =
            (new Date(events[i].startTime).getTime() -
              new Date(arr.at(-1)!.realEndTime).getTime()) /
            1000 /
            60; // minutes
          const speed = +((distance / minutes) * 60).toFixed(2);
          speed > this.speeding() &&
            currentDrivingIntermediates.length > 0 &&
            events[i].warningMessages.push(`speeding [${speed} mph]`);
        }

        if (
          currentDriving &&
          [
            'ChangeToOffDutyStatus',
            'ChangeToSleeperBerthStatus',
            'ChangeToOnDutyNotDrivingStatus',
          ].includes(events[i].dutyStatus)
        ) {
          //
          events[i].occurredAfterDriving = true;
          //
          const nextDutyStatusInfo: IStatusInfo = {
            id: events[i].id,
            totalVehicleMiles: events[i].odometer,
          };
          const intermediatesInfo: IStatusInfo[] =
            currentDrivingIntermediates.map((inter) => ({
              id: inter.id,
              totalVehicleMiles: inter.odometer,
            }));

          events[currentDriving.computeIndex].nextDutyStatusInfo =
            nextDutyStatusInfo;
          events[currentDriving.computeIndex].intermediatesInfo =
            intermediatesInfo;
        }

        if (!(i === events.length - 1 && currentDriving)) {
          occurredDuringDriving = false;
          events[i].occurredDuringDriving = false;
        }

        currentDriving = null;
        intermediateCount = 0;
        currentDrivingIntermediates = [];
      }

      // engines in driving
      if (currentDriving && events[i].statusName.includes('Engine')) {
        events[currentDriving.computeIndex].engineInfo.push({
          id: events[i].id,
          totalVehicleMiles: events[i].odometer,
        });
      }

      //////////////
      // disconnected refuel
      const refuelTime = this.refuelMarker()?.time;
      if (
        refuelTime &&
        isDriving(events[i]) &&
        DateTime.fromISO(refuelTime).toUTC().toMillis() <
          DateTime.fromISO(events[i].endTime).toUTC().toMillis()
      ) {
        this.refuelMarker.set(null);
      }

      if (i === events.length - 1 && this.refuelMarker()) {
        events[currentDutyStatus.computeIndex].refuel = true;
        this.refuelMarker.set(null);
      }

      ///////////////////
      // update driver state
      (events[i].driver.viewId === events[i].driver.id
        ? this.driverState
        : this.coDriverState
      ).update((prev) => ({
        ...prev,
        currentDriving,
        intermediateCount,
        currentDrivingIntermediates: currentDrivingIntermediates.length
          ? currentDrivingIntermediates
          : [],
        currentDutyStatus,
        occurredDuringDriving,
        shiftIsReadyToStart,
        coDriverLastBreakStatus,
        break: { ...prev.break, shift, cycle },
      }));
    }

    return events;
  };

  detectAndBindTeleport = (importedEvents: IEvent[]) => {
    let events = [...importedEvents];
    for (let i = 0; i < events.length - 1; i++) {
      // detect and report undefined odometer value
      !events[i].odometer &&
        !events[i].isFirstEvent &&
        events[i].errorMessages.push('undefined odometer value');

      // check for teleport
      events[i + 1].isTeleport = this.isTeleport(events[i], events[i + 1]);
    }
    return events;
  };

  isTeleport = (ev1: IEvent, ev2: IEvent) => {
    const mileageDifference = Math.abs(ev1.odometer - ev2.odometer);
    // truck change
    if (ev1.vehicleId && ev2.vehicleId && ev1.vehicleId !== ev2.vehicleId) {
      ev2.truckChange = true;
      ev2.truckChangeFrom = ev1.vehicleName;
      return 0;
    }
    // odometer drop
    if (ev1.odometer > ev2.odometer) return -mileageDifference;
    if (mileageDifference > 2) {
      // case co-driver's 1st event
      if (ev2.viewId === 1) {
        return 0;
      }
      // [[ teleport detected ]]
      if (!isDriving(ev1) && !isPc(ev1) && !ev1.occurredDuringDriving) {
        return mileageDifference;
      }
    } else {
      // location mismatch
      if (!ev1.locationDisplayName || !ev2.locationDisplayName) return 0;
      // ...
      if (!isDriving(ev1) && !isPc(ev1) && !ev1.occurredDuringDriving)
        // pcYm => pc
        this.locationMismatch(
          ev1.locationDisplayName,
          ev2.locationDisplayName,
        ) && (ev2.locationMismatch = true);
    }
    return 0;
  };

  parseLocation(location: string): {
    miles: number;
    direction: string | null;
    baseName: string;
  } {
    // get miles? (1-9999), direction? and the base location name
    const regex = /^(\d{1,4})?mi\s*([NESW]{1,3})?\s*(.*)$/i;
    const match = regex ? location.match(regex) : null;

    if (!match) {
      return { miles: 0, direction: null, baseName: location.trim() };
    }

    const milesStr = match[1];
    const direction = match[2] ? match[2].toUpperCase() : null;
    const baseName = match[3].trim();

    const miles = milesStr ? parseInt(milesStr, 10) : 0;

    return { miles, direction, baseName };
  }

  locationMismatch(location1: string, location2: string) {
    const opposites: { [key: string]: string } = {
      N: 'S',
      S: 'N',
      E: 'W',
      W: 'E',
      NE: 'SW',
      SW: 'NE',
      NW: 'SE',
      SE: 'NW',
      NNE: 'SSW',
      SSW: 'NNE',
      NNW: 'SSE',
      SSE: 'NNW',
      ENE: 'WSW',
      WSW: 'ENE',
      ESE: 'WNW',
      WNW: 'ESE',
    };

    const loc1 = this.parseLocation(location1);
    const loc2 = this.parseLocation(location2);

    if (loc1.baseName !== loc2.baseName) {
      return true;
    }

    if (
      loc1.direction &&
      loc2.direction &&
      opposites[loc1.direction] === loc2.direction
    ) {
      const distanceDifference = loc1.miles + loc2.miles;
      return distanceDifference > 2;
    }

    const distanceDifference = Math.abs(loc1.miles - loc2.miles);
    return distanceDifference > 2;
  }
}
