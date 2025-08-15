import { inject, Injectable, signal } from '@angular/core';

import {
  bindEventViewId,
  filterEvents,
  getStatusName,
  isDriving,
  isDutyStatus,
  isIntermediate,
  isPcOrYm,
} from '../helpers/monitor.helpers';

import {
  IDailyLogs,
  IDriverIdAndName,
  IDriverState,
  IEvent,
  IRefuels,
} from '../interfaces/driver-daily-log-events.interface';
import { ITenant } from '../interfaces';
import { ApiService } from './api.service';
import { DateTime } from 'luxon';

@Injectable({
  providedIn: 'root',
})
export class ComputeEventsService {
  apiService = inject(ApiService);

  initialDriverState: IDriverState = {
    currentDriving: null,
    currentDrivingIntermediates: [],
    intermediateCount: 0,
    currentDutyStatus: {} as IEvent,
    occurredDuringDriving: false,
    shiftIsReadyToStart: false,
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
    sleeperMinDuration?: number
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

    driverEvents.forEach((e) => {
      e.driver = {
        id: driverDailyLog.driverId,
        viewId: driverDailyLog.driverId,
        name: driverDailyLog.driverFullName,
      };
    });
    if (coDriverDailyLog && coDriverEvents && coDriverEvents?.length > 0) {
      coDriverEvents.forEach(
        (e) =>
          (e.driver = {
            id: coDriverDailyLog.driverId,
            viewId: driverDailyLog.driverId,
            name: coDriverDailyLog.driverFullName,
          })
      );
      events = [...driverEvents, ...coDriverEvents].sort(
        (a, b) =>
          new Date(a.realStartTime).getTime() -
          new Date(b.realStartTime).getTime()
      );
    } else events = [...driverEvents];

    events = events.filter((event) => filterEvents(event));

    //
    // add latest Refuel
    if (driverDailyLog.refuels.length) {
      const refuel = driverDailyLog.refuels.reduce((latest, current) => {
        return latest.time > current.time ? latest : current;
      });
      this.refuelMarker.set(refuel);
    }

    events = this.computeEvents(
      events,
      ptiDuration,
      prolongedOnDutiesDuration,
      sleeperMinDuration,
      driverDailyLog.date,
      tenant
    );
    events = this.detectAndBindTeleport(events);

    //////////////
    // Custom events
    driverEvents.forEach((e) => {
      // PC/YM DriverIndicationClear
      if (e.dutyStatus === 'DriverIndicationClear') {
        e.pcYmCLR = true;
        e.statusName = 'PC/YM CLR';

        e.date = driverDailyLog.date;
        tenant && (e.tenant = tenant);
        events.push(e);
      }
      // 2nd PC/YM event
      if (
        e.eventType ===
        'ChangeInDriversIndicationOfAuthorizedPersonalUseOfCmvOrYardMoves'
      ) {
        if (e.dutyStatus === 'DriverIndicationAuthorizedPersonalUseCmv') {
          e.statusName = 'PC (2nd)';
          e.date = driverDailyLog.date;
          tenant && (e.tenant = tenant);
          events.push(e);
        }
        if (e.dutyStatus === 'DriverIndicationYardMoves') {
          e.statusName = 'YM (2nd)';
          e.date = driverDailyLog.date;
          tenant && (e.tenant = tenant);
          events.push(e);
        }
      }
      // malf or data diag
      if (e.eventType === 'MalfunctionOrDataDiagnosticDetectionOccurrence') {
        e.malf = true;
        e.date = driverDailyLog.date;
        tenant && (e.tenant = tenant);
        e.dutyStatus === 'DataDiagnostic' && (e.statusName = 'Diagnostic');
        e.dutyStatus === 'DataDiagnosticClear' && (e.statusName = 'Diag. CLR');
        e.dutyStatus === 'DataDiagnostic-E' && (e.statusName = 'Diag. CLR (E)');
        events.push(e);
      }
    });

    return events.sort(
      (a, b) =>
        new Date(a.realStartTime).getTime() -
        new Date(b.realStartTime).getTime()
    );
  };

  computeEvents = (
    importedEvents: IEvent[],
    ptiDuration?: number,
    prolongedOnDutiesDuration?: number,
    sleeperMinDuration?: number,
    date?: string,
    tenant?: ITenant
  ) => {
    let events = [...importedEvents];
    let currentDriver = {} as IDriverIdAndName;
    let wannabePTIonDutyId = 0;

    ////////////////////
    // compute events
    for (let i = 0; i < events.length; i++) {
      let {
        currentDriving,
        currentDrivingIntermediates,
        intermediateCount,
        currentDutyStatus,
        occurredDuringDriving,
        shiftIsReadyToStart,
        break: { shift, cycle },
      } = events[i].driver.viewId === events[i].driver.id
        ? this.driverState()
        : this.coDriverState();
      events[i].computeIndex = i;
      events[i].errorMessages = [];
      events[i].statusName = getStatusName(events[i].dutyStatus);
      events[i].occurredDuringDriving = occurredDuringDriving;
      date && (events[i].date = date);
      tenant && (events[i].tenant = tenant);

      // fleet manager
      events[i].origin ===
        'EditRequestedByAnAuthenticatedUserOtherThanTheDriver' &&
        (events[i].statusName = 'Fleet manager');

      // auto-assumed events
      events[i].origin === 'AssumedFromUnidentifiedDriverProfile' &&
        events[i].errorMessages.push('origin: Auto-assumed');

      // assign end of shift for current driver
      if (events[i].driver?.id !== currentDriver.id) {
        currentDriver = events[i].driver;
        events[i].shift = true;
      }

      // onDuty, origin: Auto
      if (
        events[i].statusName === 'On Duty' &&
        events[i].origin === 'AutomaticallyRecordedByEld' &&
        !isDriving(currentDutyStatus)
      )
        currentDutyStatus.statusName &&
          events[i].errorMessages.push(
            `[origin: Auto] after ${currentDutyStatus.statusName}`
          );

      // assign duty status and double duty check
      if (isDutyStatus(events[i])) {
        if (currentDutyStatus.id) {
          currentDutyStatus.driver?.id === events[i].driver?.id && // exclude co drivers events
            (currentDutyStatus.statusName === events[i].statusName
              ? events[i].errorMessages.push('double Duty status')
              : (currentDutyStatus = events[i]));
        } else currentDutyStatus = events[i];

        //
      }
      ////////////////////
      // Pre-Trip Inspection validity ````````````#####################`````````````````##########################````````````````#################````````````
      if (
        // case 34 break or 10h+ Sleeper/Off
        ['Sleeper Berth', 'Off Duty'].includes(currentDutyStatus.statusName) &&
        currentDutyStatus.realDurationInSeconds / 60 / 60 > 10
      ) {
        shiftIsReadyToStart = true;
      }
      // ...
      // combined 10h+ break from multiple switch from off to sleep
      // ...
      // case 34h marker
      // ...
      const timeSinceShiftResetOccured =
        new Date().getTime() - new Date(shift).getTime(); // miliseconds
      const timeSinceCycleResetOccured =
        new Date().getTime() - new Date(cycle).getTime(); // miliseconds
      const timeSinceEventOccured =
        new Date().getTime() - new Date(events[i].realStartTime).getTime(); // miliseconds
      if (
        (timeSinceShiftResetOccured > timeSinceEventOccured ||
          timeSinceCycleResetOccured > timeSinceEventOccured ||
          shiftIsReadyToStart) &&
        events[i].eventType !== 'CmvEnginePowerUpOrShutDownActivity' &&
        events[i].dutyStatus !== 'DriverIndicationAuthorizedPersonalUseCmv'
        //  && currentDutyStatus.driver?.id === events[i].driver?.id
      ) {
        // ## DM International
        // Jul 8, 2025
        // Milan Krstic
        if (
          events[i].statusName === 'On Duty' &&
          events[i].realDurationInSeconds !== 0
        ) {
          // PTI duration validity
          if (
            events[i].realDurationInSeconds >= (ptiDuration ? ptiDuration : 901)
          ) {
            timeSinceShiftResetOccured > timeSinceEventOccured && (shift = '');
            timeSinceCycleResetOccured > timeSinceEventOccured && (cycle = '');
            shiftIsReadyToStart = false;
            wannabePTIonDutyId = 0;
            // console.log('[Pre-Trip Inspection validity] valid PTI detected');
          } else {
            wannabePTIonDutyId = i;
            // console.log('[Pre-Trip Inspection validity] short PTI detected');
          }
        }
        // no PTI
        if (events[i].statusName === 'Driving') {
          wannabePTIonDutyId
            ? events[wannabePTIonDutyId].errorMessages.push(
                'short Pre-Trip Inspection'
              )
            : events[i].errorMessages.push('no Pre-Trip Inspection');

          timeSinceShiftResetOccured > timeSinceEventOccured && (shift = '');
          timeSinceCycleResetOccured > timeSinceEventOccured && (cycle = '');
          shiftIsReadyToStart = false;
          wannabePTIonDutyId = 0;
          // console.log(
          // '[Pre-Trip Inspection validity] driving occured before valid PTI'
          // );
        }
      }

      ////////////////////
      // prolonged On Duties
      if (events[i].dutyStatus === 'ChangeToOnDutyNotDrivingStatus') {
        const duration = this.getOnDutyDuration(events[i]);
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
            events[i].errorMessages.push('34hr break outside Off Duty');
        } else {
          events[i].realDurationInSeconds / 60 / 60 >
            (sleeperMinDuration ? sleeperMinDuration : 30) &&
            events[i].errorMessages.push('34hr break outside Off Duty');
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
      }
      if (isIntermediate(events[i])) {
        intermediateCount++;
        currentDrivingIntermediates.push(events[i]);
        if (!currentDriving) {
          events[i].errorMessages.push('outside driving scope');
        } else {
          //////////////
          // intermediate location and odometer check
          console.log(currentDrivingIntermediates);
          if (currentDrivingIntermediates.length > 1) {
            const prevInter =
              currentDrivingIntermediates[
                currentDrivingIntermediates.length - 2
              ];
            if (
              prevInter.odometer === events[i].odometer &&
              prevInter.locationDisplayName === events[i].locationDisplayName
            )
              events[i].errorMessages.push('location and odometer unchanged');
            else {
              prevInter.odometer === events[i].odometer &&
                events[i].errorMessages.push('odometer unchanged');
              prevInter.locationDisplayName === events[i].locationDisplayName &&
                events[i].errorMessages.push('location unchanged');
            }

            ////////////////////////////////////////////////////////
          }

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
                'incorrect intermediate count'
              );
          }

          // case when driving has started on previous day
          if (
            currentDriving.realDurationInSeconds >
              currentDriving.durationInSeconds &&
            currentDriving.realStartTime !== currentDriving.startTime
          ) {
            let totalIntermediateCount = Math.floor(
              (currentDriving.realDurationInSeconds - 1) / 3600 // -1sec
            );
            let previousDayIntermediateCount = Math.floor(
              (currentDriving.realDurationInSeconds -
                currentDriving.durationInSeconds) /
                3600
            );

            totalIntermediateCount - previousDayIntermediateCount !==
              intermediateCount &&
              events[currentDriving.computeIndex].errorMessages.push(
                'incorrect intermediate count'
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
              (durationInSeconds - currentDriving.durationInSeconds) / 3600
            );

            totalIntermediateCount - previousDayIntermediateCount !==
              intermediateCount &&
              events[currentDriving.computeIndex].errorMessages.push(
                'incorrect intermediate count'
              );
          }

          //
          // speeding
          const arr = [currentDriving, ...currentDrivingIntermediates];
          for (let index = 0; index < arr.length - 1; index++) {
            if (arr[index].computeIndex === 0) continue;

            const speed = +(
              arr[index + 1].odometer - arr[index].odometer
            ).toFixed(2);
            speed > 74.99 &&
              events[arr[index + 1].computeIndex].errorMessages.push(
                `speeding [${speed} mph]`
              );
          }
          // last inter to sleep/off
          const distance = events[i].odometer - arr.at(-1)!.odometer;
          const minutes =
            (new Date(events[i].startTime).getTime() -
              new Date(arr.at(-1)!.realEndTime).getTime()) /
            1000 /
            60; // minutes
          const speed = +((distance / minutes) * 60).toFixed(2);
          speed > 74.9 &&
            currentDrivingIntermediates.length > 0 &&
            events[i].errorMessages.push(`speeding [${speed} mph]`);
        }

        occurredDuringDriving = false;
        events[i].occurredDuringDriving = false;
        currentDriving = null;
        intermediateCount = 0;
        currentDrivingIntermediates = [];
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
        break: { ...prev.break, shift, cycle },
      }));
    }

    return events;
  };

  getOnDutyDuration = (event: IEvent) => {
    // OnDuty has started and ended within same day
    if (event.realDurationInSeconds === event.durationInSeconds)
      return event.durationInSeconds;
    // OnDuty has started on previous day and ended on current day
    if (event.realDurationInSeconds > event.durationInSeconds) {
      return event.realDurationInSeconds;
    }
    // ongoin OnDuty has started on previous day
    else {
      const startTime = new Date(event.realStartTime).getTime();
      const now = new Date().getTime();

      return (now - startTime) / 1000;
    }
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
    if (mileageDifference > 2) {
      // case co-driver's 1st event
      if (ev2.viewId === 1) {
        return 0;
      }
      // [[ teleport detected ]]
      if (ev1.odometer > ev2.odometer) return -mileageDifference;
      if (!isDriving(ev1) && !isPcOrYm(ev1) && !ev1.occurredDuringDriving) {
        //pcYm => pc
        return mileageDifference;
      }
    } else {
      // location mismatch
      if (!ev1.locationDisplayName || !ev2.locationDisplayName) return 0;
      // ...
      if (!isDriving(ev1) && !isPcOrYm(ev1) && !ev1.occurredDuringDriving)
        //pcYm => pc
        this.locationMismatch(
          ev1.locationDisplayName,
          ev2.locationDisplayName
        ) && ev2.errorMessages.push('location mismatch');
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
