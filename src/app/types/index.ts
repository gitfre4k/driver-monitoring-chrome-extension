export type TScanMode = 'violations' | 'dot' | 'advanced' | 'pre' | 'cert';

export type TScanResult =
  | 'teleports'
  | 'eventErrors'
  | 'prolongedOnDuty'
  | 'malfOrDataDiag'
  | 'pcYm'
  | 'missingEngineOn'
  | 'manualDriving'
  | 'highEngineHours'
  | 'lowTotalEngineHours'
  | 'newDrivers'
  | 'fleetManager'
  | 'preViolations'
  | 'cycleHours'
  | 'refuelWarning'
  | 'truckChange'
  | 'certStatus';

export type TProgressMode =
  | 'determinate'
  | 'indeterminate'
  | 'buffer'
  | 'query';
