import { ITenant } from '.';

interface IHosTimers {
  break: number;
  shiftDrive: number;
  shiftWork: number;
  cycleDrive: number;
  cycleWork: number;
  regularShiftWork: number;
  regularShiftDrive: number;
}

export interface IDriverItem {
  id: number;
  cycleId: string;
  driverIntId: number;
  driverId: string;
  driverDisplayName: string;
  timeZoneOffset: string;
  driverStatus: string;
  driverPhoneNumber: string;
  vehicleId: number;
  vehicleNumber: string;
  trailerNumber: string;
  lastActivity: string; // ISO 8601 string
  lastPositionName: string;
  lastPositionLat: number;
  lastPositionLong: number;
  violations: boolean;
  eldConnected: boolean;
  companyId: number;
  cycleDays: number;
  cycleHours: number;
  cycleDaysWorked: number;
  hosTimers: IHosTimers;
  maxDrive: number;
  maxShift: number;
  maxCycle: number;
  shiftResetTime?: string; // Optional, as it might be missing for some items
  cycleResetTime?: string; // Optional
  mustEndShiftBy: string; // ISO 8601 string
  mustEndRegularShiftBy: string; // ISO 8601 string
  shiftWorkTimeAsTimeSpan: string; // "HH:MM:SS.ms" format
  shiftWorkTime: number; // in minutes or similar unit
  regularShiftWorkTimeAsTimeSpan: string; // "HH:MM:SS.ms" format
  regularShiftWorkTime: number; // in minutes or similar unit
  mustEndShiftDrivingBy?: string; // Optional, only present in one example
  shiftDriveTimeAsTimeSpan: string; // "HH:MM:SS.ms" format
  shiftDriveTime: number; // in minutes or similar unit
  cycleDriveTimeAsTimeSpan: string; // "D.HH:MM:SS.ms" format
  cycleDriveTime: number; // in minutes or similar unit
  driverDutyStatus: string;
  driverDutyStatusStartTime: string; // ISO 8601 string
  cycleWorkTimeAsTimeSpan: string; // "D.HH:MM:SS.ms" format
  cycleWorkTime: number; // in minutes or similar unit
  eligibleForFirstSplitOffDutyBreakAt?: string; // Optional
  eligibleForFirstSplitSleeperBreakAt?: string; // Optional
  firstSplitBreakStartTime: string; // ISO 8601 string (could be "0001-01-01T00:00:00Z" for uninitialized)
  shiftStartTime: string; // ISO 8601 string
  shiftDriveTimeAtFirstSplitBreakAsTimeSpan: string; // "HH:MM:SS.ms" format
  shiftDriveTimeAtFirstSplitBreak: number; // in minutes or similar unit
  isPending: boolean;
  isError: boolean;
  mustHaveBreakBy?: string; // Optional, only present in one example
  mustEndCycleBy?: string; // Optional, only present in one example
  mustEndCycleWorkBy?: string; // Optional, only present in one example
  //
  preViolationShiftDrive: number;
  preViolationShiftWork: number;
  preViolationBreak: number;
}

export interface IDrivers {
  tenant: ITenant;
  date: Date;
  totalCount: number;
  items: IDriverItem[];
}

export interface IScanPreViolations {
  [company: string]: IDrivers;
}
