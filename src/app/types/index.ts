export type TScanMode =
  | 'violations'
  | 'dot'
  | 'advanced'
  | 'pre'
  | 'cert'
  | 'deleteUE';

export type TScanResult =
  | 'teleports'
  | 'locationMismatch'
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

export type TContextMenuAction =
  | 'EXTEND_PTI'
  | 'ADD_PTI'
  | 'DELETE_ALL_ENGINES'
  | 'DELETE_DRIVING_ENGINES'
  | 'DELETE_ENGINES_IN_DRIVING'
  | 'ADD_ENGINE_OFF'
  | 'UPDATE_EVENT'
  | 'ChangeToOffDutyStatus'
  | 'ChangeToSleeperBerthStatus'
  | 'ChangeToDrivingStatus'
  | 'ChangeToOnDutyNotDrivingStatus';

export type TFocusElementAction = 'FOCUS_ELEMENT_START' | 'FOCUS_ELEMENT_STOP';

export type TEventTypeCode =
  | 'ChangeToOffDutyStatus'
  | 'ChangeToSleeperBerthStatus'
  | 'ChangeToDrivingStatus'
  | 'ChangeToOnDutyNotDrivingStatus'
  | 'IntermediateLogConventionalLocationPrecision'
  | 'IntermediateLogReducedLocationPrecision'
  | 'DriversFirstCertification'
  | 'DriversSecondCertification'
  | 'DriversThirdCertification'
  | 'DriversFourthCertification'
  | 'DriversFifthCertification'
  | 'DriversSixthCertification'
  | 'DriversSeventhCertification'
  | 'DriversEighthCertification'
  | 'DriversNinthCertification'
  | 'AuthenticatedDriverLogin'
  | 'AuthenticatedDriverLogout'
  | 'EnginePowerUpConventionalLocationPrecision'
  | 'EnginePowerUpReducedLocationPrecision'
  | 'EngineShutDownConventionalLocationPrecision'
  | 'EngineShutDownReducedLocationPrecision'
  | 'Remark'
  | 'EldConnected'
  | 'EldDisconnected'
  | 'CoDriverAdd'
  | 'CoDriverRemove'
  | 'TrailerAttach'
  | 'TrailerDetach'
  | 'VehicleSelect'
  | 'DriversDeCertificationOfRecords'
  | 'VehicleStartOfDay'
  | 'Dvir';
