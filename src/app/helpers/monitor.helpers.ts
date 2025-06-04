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

export const getStatusName = (dutyStatus: string): string => {
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
    case 'DriverIndicationAuthorizedPersonalUseCmv':
      return 'PC';
    case 'DriverIndicationYardMoves':
      return 'YM';
    default:
      return '?';
  }
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
