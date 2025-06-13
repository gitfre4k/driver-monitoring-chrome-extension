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
  IDriverIdAndName,
  IEvent,
} from '../interfaces/driver-daily-log-events.interface';

@Injectable({
  providedIn: 'root',
})
export class ComputeEventsService {
  constructor() {}
  shiftBreak = signal('');

  getComputedEvents = ({ driverDailyLog, coDriverDailyLog }: IDailyLogs) => {
    if (!driverDailyLog) return [];

    driverDailyLog.shiftBreak && this.shiftBreak.set(driverDailyLog.shiftBreak);

    let driverEvents = bindEventViewId(driverDailyLog.events);
    let coDriverEvents = coDriverDailyLog
      ? bindEventViewId(coDriverDailyLog.events)
      : null;

    let events = [] as IEvent[];

    if (coDriverDailyLog && coDriverEvents && coDriverEvents?.length > 0) {
      driverEvents.forEach(
        (e) =>
          (e.driver = {
            id: driverDailyLog.driverId,
            name: driverDailyLog.driverFullName,
          })
      );
      coDriverEvents.forEach(
        (e) =>
          (e.driver = {
            id: coDriverDailyLog.driverId,
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
    events = this.computeEvents(events);
    events = this.detectAndBindTeleport(events);

    return events;
  };

  computeEvents = (importedEvents: IEvent[]) => {
    let events = [...importedEvents];

    let occurredDuringDriving = false;
    let currentDriving: IEvent | null = null;
    let intermediateCount = 0;
    let currentDutyStatus = {} as IEvent;
    let currentDriver = {} as IDriverIdAndName;

    //
    // compute events
    for (let i = 0; i < events.length; i++) {
      events[i].computeIndex = i;
      events[i].statusName = getStatusName(events[i].dutyStatus);
      events[i].occurredDuringDriving = occurredDuringDriving;

      // co-drivers shift end
      if (events[i].driver?.id !== currentDriver.id) {
        currentDriver = events[i].driver;
        events[i].shift = true;
      }

      // too short or no PTI
      const shiftBreak =
        new Date().getTime() - new Date(this.shiftBreak()).getTime(); // miliseconds since shift was ready to start
      const pti =
        new Date().getTime() - new Date(events[i].realStartTime).getTime(); // miliseconds since event occured
      if (
        shiftBreak > pti &&
        events[i].eventType !== 'CmvEnginePowerUpOrShutDownActivity' &&
        events[i].dutyStatus !== 'DriverIndicationAuthorizedPersonalUseCmv'
      ) {
        if (
          events[i].statusName !== 'On Duty' ||
          events[i].realDurationInSeconds < 901
        ) {
          events[i].errorMessage = 'Too short or No PTI';
        }
        this.shiftBreak.set('');
      }

      // double duty status
      if (isDutyStatus(events[i])) {
        currentDutyStatus.statusName === events[i].statusName &&
        currentDutyStatus.driver?.id === events[i].driver?.id
          ? (events[i].errorMessage = 'double Duty status')
          : (currentDutyStatus = events[i]);
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
          sleeperDuration > 30 &&
            (events[i].errorMessage = '34 hour break outside Off Duty');
        } else {
          events[i].realDurationInSeconds / 60 / 60 > 30 &&
            (events[i].errorMessage = '34 hour break outside Off Duty');
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
          events[i].errorMessage = 'outside driving scope';
        } else {
          let diff =
            +new Date(events[i].realStartTime) -
            +new Date(currentDriving.realStartTime);
          let remainder = diff % (3600 * 1000);
          !(3600 * 1000 - remainder <= 1000 || remainder <= 1000) &&
            (events[i].errorMessage = 'incorrect timestamp');
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
              (events[currentDriving.computeIndex].errorMessage =
                'incorrect intermediate count');
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
              (events[currentDriving.computeIndex].errorMessage =
                'incorrect intermediate count');
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
              (events[currentDriving.computeIndex].errorMessage =
                'incorrect intermediate count');
          }
        }

        occurredDuringDriving = false;
        events[i].occurredDuringDriving = false;
        currentDriving = null;
        intermediateCount = 0;
      }
    }
    return events;
  };

  detectAndBindTeleport = (importedEvents: IEvent[]) => {
    let events = [...importedEvents];

    for (let i = 0; i < events.length - 1; i++) {
      // detect and report undefined odometer value
      !events[i].odometer &&
        !events[i].isFirstEvent &&
        (events[i].errorMessage = 'undefined odometer value');

      // check for teleport
      events[i + 1].isTeleport = this.isTeleport(events[i], events[i + 1]);
    }
    return events;
  };

  isTeleport = (ev1: IEvent, ev2: IEvent) => {
    const mileageDifference = Math.abs(ev1.odometer - ev2.odometer);
    if (ev1.vehicleId !== ev2.vehicleId) {
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
