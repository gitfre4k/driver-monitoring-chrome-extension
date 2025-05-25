export interface IEvent {
  id: number;
  dutyStatus: string;
  startTime: string;
  realStartTime: string;
  endTime: string;
  durationInSeconds: number;
  realDurationInSeconds: number;
  locationDisplayName: string;
  notes: string;
  engineMinutes: number;
  odometer: number;
  origin: string;
  isBasic: boolean;
  vehicleName: string;
  vehicleVin: string;
  vehicleId: number;
  eventType: string;
  eventCode: number;
  attachedTrailers: string;
  shippingDocuments: string;
  eventSequenceNumber: string;
  elapsedEngineHours: number;
  accumulatedVehicleMiles: number;
  isEventMissingPowerUp: boolean;
  realEndTime: string;

  statusName: string;
  isTeleport: boolean;
  occurredDuringDriving: boolean;
  truckChange: boolean;
  viewId: number;
  error: boolean;
  errorMessage: string;
  computeIndex: number;
}

export interface IVehicle {
  id: number;
  name: string;
}

export interface IHosDetails {
  maxDrive: number;
  maxShift: number;
  maxCycle: number;
  shiftResetTime: string;
  cycleResetTime: string;
  mustEndShiftBy: string;
  mustEndRegularShiftBy: string;
  shiftWorkTimeAsTimeSpan: string;
  shiftWorkTime: number;
  regularShiftWorkTimeAsTimeSpan: string;
  regularShiftWorkTime: number;
  shiftDriveTimeAsTimeSpan: string;
  shiftDriveTime: number;
  mustEndCycleDrivingBy: string;
  cycleDriveTimeAsTimeSpan: string;
  cycleDriveTime: number;
  driverDutyStatus: string;
  driverDutyStatusStartTime: string;
  cycleWorkTimeAsTimeSpan: string;
  cycleWorkTime: number;
  eligibleForFirstSplitOffDutyBreakAt: string;
  firstSplitBreakStartTime: string;
  shiftStartTime: string;
  shiftDriveTimeAtFirstSplitBreakAsTimeSpan: string;
  shiftDriveTimeAtFirstSplitBreak: number;
  isPending: boolean;
  isError: boolean;
}

export interface IEngineOnEventData {
  time: string;
  totalVehicleMiles: number;
  totalEngineHours: number;
}

export interface IDriverDailyLogEvents {
  date: string;
  startOfDay: string;
  homeTerminalTimeZone: string;
  windowsHomeTerminalZone: string;
  hoursToday: number;
  driverId: number;
  driverAssignedId: string;
  driverFullName: string;
  violations: any[]; // Assuming an array of some type, can be more specific if known
  events: IEvent[];
  coDrivers: any[]; // Assuming an array of some type, can be more specific if known
  vehicles: IVehicle[];
  distance: string;
  odometerUnits: string;
  reassignInProgress: boolean;
  companyId: number;
  companyName: string;
  companyAddress: string;
  minutesWorked: number;
  cycleRule: string;
  trailers: string[];
  shippingDocs: string[];
  pendingShippingDocs: any[]; // Assuming an array of some type, can be more specific if known
  previousLogDate: string;
  certified: boolean;
  signature: string;
  inspectionReports: any[]; // Assuming an array of some type, can be more specific if known
  exceptions: any[]; // Assuming an array of some type, can be more specific if known
  hosDetails: IHosDetails;
  refuels: any[]; // Assuming an array of some type, can be more specific if known
  firstEventTime: string;
  engineOnEventData: IEngineOnEventData;
  isEngineOffFirstEvent: boolean;
  isEngineOffInnerEvents: boolean;
}
