import { IEvent } from '../interfaces/driver-daily-log-events.interface';

export const bindEventViewId = (importedEvents: IEvent[]) => {
  let events = [...importedEvents];
  for (let i = 0; i < events.length; i++) {
    events[i].viewId = i + 1;
  }
  return events;
};

export const filterEvents = (event: IEvent): boolean => {
  return [
    'ChangeInDriversDutyStatus',
    'IntermediateLog',
    'CmvEnginePowerUpOrShutDownActivity',
  ].includes(event.eventType);
};

export const computeEvents = (importedEvents: IEvent[]) => {
  let events = [...importedEvents];

  let occurredDuringDriving = false;
  let currentDriving: IEvent | null = null;
  let intermediateCount = 0;

  for (let i = 0; i < events.length; i++) {
    events[i].statusName = getStatusName(events[i].dutyStatus);
    events[i].occurredDuringDriving = occurredDuringDriving;

    if (isDriving(events[i])) {
      occurredDuringDriving = true;
      currentDriving = events[i];
    }
    if (isIntermediate(events[i])) {
      console.log('pre ++');
      intermediateCount++;
      console.log('post ++');
      if (!currentDriving) {
        events[i].error = true;
        events[i].errorMessage = 'outside driving scope';
      } else {
        let diff =
          +new Date(events[i].realStartTime) -
          +new Date(currentDriving.realStartTime);
        let remainder = diff % (3600 * 1000);
        events[i].error = !(
          3600 * 1000 - remainder <= 1000 || remainder <= 1000
        );
        events[i].error && (events[i].errorMessage = 'incorrect timestamp');
      }
    }
    if (
      [
        'ChangeToOffDutyStatus',
        'ChangeToSleeperBerthStatus',
        'ChangeToOnDutyNotDrivingStatus',
      ].includes(events[i].dutyStatus)
    ) {
      if (currentDriving) {
        if (
          currentDriving.durationInSeconds ===
          currentDriving.realDurationInSeconds
        ) {
          console.log(
            Math.round(currentDriving.durationInSeconds / 60 / 60),
            'math'
          );
          console.log(intermediateCount, 'intermediateCount');

          Math.floor(currentDriving.durationInSeconds / 60 / 60) !==
            intermediateCount &&
            (events[currentDriving.viewId - 1].errorMessage =
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

export const detectAndBindTeleport = (importedEvents: IEvent[]) => {
  let events = [...importedEvents];
  for (let i = 0; i < events.length - 1; i++) {
    events[i + 1].isTeleport = isTeleport(events[i], events[i + 1]);
  }
  return events;
};

const getStatusName = (dutyStatus: string): string => {
  switch (dutyStatus) {
    case 'ChangeToOffDutyStatus':
      return 'Off Duty';
    case 'ChangeToSleeperBerthStatus':
      return 'Sleeper Berth';
    case 'ChangeToDrivingStatus':
      return 'Driving';
    case 'ChangeToOnDutyNotDrivingStatus':
      return 'On Duty';
    case 'IntermediateLogConventionalLocationPrecision':
    case 'IntermediateLogReducedLocationPrecision':
      return 'Intermediate';
    case 'EnginePowerUpConventionalLocationPrecision':
    case 'EnginePowerUpReducedLocationPrecision':
      return 'Engine On';
    case 'EngineShutDownConventionalLocationPrecision':
    case 'EngineShutDownReducedLocationPrecision':
      return 'Engine Off';
    default:
      return '?';
  }
};

const isTeleport = (ev1: IEvent, ev2: IEvent) => {
  const mileageDifference = Math.abs(ev1.odometer - ev2.odometer);
  if (ev1.vehicleId !== ev2.vehicleId) {
    ev2.truckChange = true;
    return false;
  }
  if (mileageDifference > 2) {
    if (ev1.odometer > ev2.odometer) return true;
    if (!isDriving(ev1) && !ev1.occurredDuringDriving) return true;
  }

  return false;
};

const isDriving = (ev: IEvent) => {
  return ev.statusName === 'Driving';
};
const isIntermediate = (ev: IEvent) => {
  return ev.statusName === 'Intermediate';
};
