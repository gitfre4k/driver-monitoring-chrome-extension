export type TScanMode =
  | "violations"
  | "dot"
  | "advanced"
  | "pre"
  | "cert"
  | "deleteUE"
  | "admin"
  | "smartFix";

export type TErrorParsedComparison = "smaller" | "greater";

export type TScanResult =
  | "teleports"
  | "locationMismatch"
  | "eventErrors"
  | "eventWarnings"
  | "prolongedOnDuty"
  | "malfOrDataDiag"
  | "pcYm"
  | "missingEngineOn"
  | "manualDriving"
  | "highEngineHours"
  | "lowTotalEngineHours"
  | "newDrivers"
  | "fleetManager"
  | "preViolations"
  | "cycleHours"
  | "refuelWarning"
  | "truckChange"
  | "certStatus"
  | "eventNotes"
  | "statusOverflow";

export type TProgressMode =
  | "determinate"
  | "indeterminate"
  | "buffer"
  | "query";

export type TContextMenuAction =
  | "EXTEND_PTI"
  | "ADD_PTI"
  | "DELETE_ALL_ENGINES"
  | "DELETE_DRIVING_ENGINES"
  | "DELETE_ENGINES_IN_DRIVING"
  | "ADD_ENGINE_OFF"
  | "UPDATE_EVENT"
  | "PARTIAL_ON_TO_OFF"
  | "PARTIAL_ON_TO_SLEEP"
  | "PARTIAL_TO_ON"
  | "RESIZE"
  | "ADVANCED_RESIZE"
  | "SHIFT_EVENTS"
  | "DELETE_SELECTED_EVENTS"
  | "DUPLICATE"
  | "COPY_LOCATION"
  | "PASTE_LOCATION"
  | "ChangeToOffDutyStatus"
  | "ChangeToSleeperBerthStatus"
  | "ChangeToDrivingStatus"
  | "ChangeToOnDutyNotDrivingStatus"
  | "ADD_PTI_NOTE";

export type TFocusElementAction =
  | "FOCUS_TACHOGRAPH_START"
  | "FOCUS_TACHOGRAPH_STOP"
  | "ELEMENT_ON_CLICK";

export type TEventTypeCode =
  | "ChangeToOffDutyStatus"
  | "ChangeToSleeperBerthStatus"
  | "ChangeToDrivingStatus"
  | "ChangeToOnDutyNotDrivingStatus"
  | "IntermediateLogConventionalLocationPrecision"
  | "IntermediateLogReducedLocationPrecision"
  | "DriversFirstCertification"
  | "DriversSecondCertification"
  | "DriversThirdCertification"
  | "DriversFourthCertification"
  | "DriversFifthCertification"
  | "DriversSixthCertification"
  | "DriversSeventhCertification"
  | "DriversEighthCertification"
  | "DriversNinthCertification"
  | "AuthenticatedDriverLogin"
  | "AuthenticatedDriverLogout"
  | "EnginePowerUpConventionalLocationPrecision"
  | "EnginePowerUpReducedLocationPrecision"
  | "EngineShutDownConventionalLocationPrecision"
  | "EngineShutDownReducedLocationPrecision"
  | "Remark"
  | "EldConnected"
  | "EldDisconnected"
  | "CoDriverAdd"
  | "CoDriverRemove"
  | "TrailerAttach"
  | "TrailerDetach"
  | "VehicleSelect"
  | "DriversDeCertificationOfRecords"
  | "VehicleStartOfDay"
  | "Dvir";

export type TInputTime = "hours" | "minutes" | "seconds" | "period";

export type TDutyStatusName =
  | "On Duty"
  | "Sleeper Berth"
  | "Off Duty"
  | "Driving"
  | "PC"
  | "YM";

export type TBackednData = "shiftReport" | "problems" | "fmcsaInspections";
