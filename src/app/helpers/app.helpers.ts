import { IEvent } from '../interfaces/driver-daily-log-events.interface';

export const bindEventViewId = (importedEvents: IEvent[]) => {
  let events = [...importedEvents];
  for (let i = 0; i < events.length; i++) {
    events[i].viewId = i + 1;
  }
  return events;
};

export const filterEvents = (event: IEvent): boolean => {
  return (
    [
      'ChangeInDriversDutyStatus',
      'IntermediateLog',
      'CmvEnginePowerUpOrShutDownActivity',
    ].includes(event.eventType) || event.dutyStatus === 'VehicleStartOfDay'
  );
};

export const getStatusName = (dutyStatus: string): string => {
  switch (dutyStatus) {
    case 'ChangeToOffDutyStatus':
      return 'Off Duty';
    case 'ChangeToSleeperBerthStatus':
      return 'Sleeper Berth';
    case 'ChangeToDrivingStatus':
    case 'ChangeToDrivingStatus-E':
      return 'Driving';
    case 'ChangeToOnDutyNotDrivingStatus':
    case 'ChangeToOnDutyNotDrivingStatus-E':
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
    case 'DriverIndicationAuthorizedPersonalUseCmv':
      return 'PC';
    case 'DriverIndicationYardMoves':
      return 'YM';
    case 'VehicleStartOfDay':
      return 'Start Day';
    default:
      return '?';
  }
};

export const isPcOrYm = (ev: IEvent) => {
  return ['PC', 'YM', 'PC (2nd)', 'YM (2nd)'].includes(ev.statusName);
};

export const isDriving = (ev: IEvent) => {
  return ev.statusName === 'Driving';
};
export const isIntermediate = (ev: IEvent) => {
  return ev.statusName === 'Intermediate';
};

export const isDutyStatus = (ev: IEvent) => {
  return [
    'On Duty',
    'Sleeper Berth',
    'Driving',
    'Off Duty',
    'PC',
    'YM',
  ].includes(ev.statusName);
};

export const getStatusDuration = (event: IEvent) => {
  // status has started and ended within same day
  if (event.realDurationInSeconds === event.durationInSeconds) {
    return event.durationInSeconds;
  }
  // status has started on previous day and ended on current day
  if (event.realDurationInSeconds > event.durationInSeconds) {
    return event.realDurationInSeconds;
  }
  // ongoin status has started on previous day
  else {
    const startTime = new Date(event.realStartTime).getTime();
    const now = new Date().getTime();

    return (now - startTime) / 1000;
  }
};
