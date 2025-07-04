import { Injectable, signal } from '@angular/core';

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
  IDriverBreaks,
  IDriverIdAndName,
  IDriverState,
  IEvent,
} from '../interfaces/driver-daily-log-events.interface';
import { ITenant } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class ComputeEventsService {
  initialDriverState: IDriverState = {
    currentDriving: null,
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

  constructor() {}

  getComputedEvents = (
    { driverDailyLog, coDriverDailyLog }: IDailyLogs,
    tenant?: ITenant,
    ptiDuration?: number,
    sleeperMinDuration?: number
  ) => {
    if (!driverDailyLog) return [];

    // initialize state
    this.driverState.set(this.initialDriverState);
    this.coDriverState.set(this.initialDriverState);
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
    coDriverDailyLog?.shiftBreak &&
      this.driverState.update((prev) => ({
        ...prev,
        break: { ...prev.break, shift: coDriverDailyLog.shiftBreak },
      }));
    coDriverDailyLog?.cycleBreak &&
      this.driverState.update((prev) => ({
        ...prev,
        break: { ...prev.break, cycle: coDriverDailyLog.cycleBreak },
      }));

    let events = [] as IEvent[];
    let driverEvents = bindEventViewId(driverDailyLog.events);
    let coDriverEvents = coDriverDailyLog
      ? bindEventViewId(coDriverDailyLog.events)
      : null;

    driverEvents.forEach(
      (e) =>
        (e.driver = {
          id: driverDailyLog.driverId,
          viewId: driverDailyLog.driverId,
          name: driverDailyLog.driverFullName,
        })
    );
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
    events = this.computeEvents(
      events,
      ptiDuration,
      sleeperMinDuration,
      driverDailyLog.date,
      tenant
    );
    events = this.detectAndBindTeleport(events);

    return events;
  };

  computeEvents = (
    importedEvents: IEvent[],
    ptiDuration?: number,
    sleeperMinDuration?: number,
    date?: string,
    tenant?: ITenant
  ) => {
    let events = [...importedEvents];
    let currentDriver = {} as IDriverIdAndName;

    //
    // compute events
    for (let i = 0; i < events.length; i++) {
      let {
        currentDriving,
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

      // assign current driver co-drivers shift end
      if (events[i].driver?.id !== currentDriver.id) {
        currentDriver = events[i].driver;
        events[i].shift = true;
      }

      // assign duty status and double duty check
      if (isDutyStatus(events[i])) {
        currentDutyStatus.driver?.id === events[i].driver?.id && // exclude co drivers events
          (currentDutyStatus.statusName === events[i].statusName
            ? events[i].errorMessages.push('double Duty status')
            : (currentDutyStatus = events[i]));
        //
      }

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
        //
        // ## Fagor Trucking, LLC
        // June 13, 2025
        // ABDI BADIL && Abdi Hussein Mohamed
        //
        if (events[i].statusName === 'Driving') {
          events[i].errorMessages.push('no Pre-Trip Inspection');
          timeSinceShiftResetOccured > timeSinceEventOccured && (shift = '');
          timeSinceCycleResetOccured > timeSinceEventOccured && (cycle = '');
          shiftIsReadyToStart = false;
          console.log(
            '[Pre-Trip Inspection validity] driving occured before PTI was detected'
          );
        }
        if (
          events[i].statusName === 'On Duty' &&
          events[i].realDurationInSeconds !== 0 &&
          events[i].realDurationInSeconds < (ptiDuration ? ptiDuration : 901)
        ) {
          events[i].errorMessages.push('short Pre-Trip Inspection');
          timeSinceShiftResetOccured > timeSinceEventOccured && (shift = '');
          timeSinceCycleResetOccured > timeSinceEventOccured && (cycle = '');
          shiftIsReadyToStart = false;
          console.log('[Pre-Trip Inspection validity] short PTI detected');
        }
        if (
          events[i].statusName === 'On Duty' &&
          events[i].realDurationInSeconds > (ptiDuration ? ptiDuration : 901)
        ) {
          timeSinceShiftResetOccured > timeSinceEventOccured && (shift = '');
          timeSinceCycleResetOccured > timeSinceEventOccured && (cycle = '');
          shiftIsReadyToStart = false;
          console.log('[Pre-Trip Inspection validity] valid PTI detected');
        }
      }

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

      // checking for intermediate validity
      if (isDriving(events[i])) {
        occurredDuringDriving = true;
        currentDriving = events[i];
      }
      if (isIntermediate(events[i])) {
        intermediateCount++;
        if (!currentDriving) {
          events[i].errorMessages.push('outside driving scope');
        } else {
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
            Math.floor((currentDriving.durationInSeconds - 1) / 3600) !== // -1
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
              (currentDriving.realDurationInSeconds - 1) / 3600 // -1
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
          // case when checking ongoing driving that has started on previous day
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
        }

        occurredDuringDriving = false;
        events[i].occurredDuringDriving = false;
        currentDriving = null;
        intermediateCount = 0;
      }

      (events[i].driver.viewId === events[i].driver.id
        ? this.driverState
        : this.coDriverState
      ).update((prev) => ({
        ...prev,
        currentDriving,
        intermediateCount,
        currentDutyStatus,
        occurredDuringDriving,
        shiftIsReadyToStart,
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
    if (ev1.vehicleId && ev2.vehicleId && ev1.vehicleId !== ev2.vehicleId) {
      ev2.truckChange = true;
      return 0;
    }
    if (mileageDifference > 2) {
      // case co-driver's 1st event
      if (ev2.viewId === 1) {
        return 0;
      }
      // [[ teleport detected ]]
      if (ev1.odometer > ev2.odometer) return -mileageDifference;
      if (!isDriving(ev1) && !isPcOrYm(ev1) && !ev1.occurredDuringDriving)
        return mileageDifference;
    }

    return 0;
  };
}
