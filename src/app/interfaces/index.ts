import { ProgressBarMode } from '@angular/material/progress-bar';

export interface IViolations {
  totalCount: number;
  items: [
    {
      id: number;
      driverId: string;
      driverName: string;
      violationsCount: number;
      violations: [
        {
          violationId: string;
          type: string;
          startTime: string;
          endTime: string;
          logDate: string;
          homeTerminalTimeZone: string;
        }
      ];
    }
  ];
}

export interface IProgressBar {
  mode: ProgressBarMode;
  value: number;
  bufferValue: number;
  constant: number;
  currentCompany: string;
  totalCount: number;
}

export interface IScanViolations {
  company: string;
  violations: IViolations;
}

export interface IScanDOTInspections {
  company: string;
  inspections: IDOTInspections;
}

export interface IScanErrors {
  error: { name: string; message: string };
  company: ITenant;
}

export interface IDOTInspections {
  totalCount: number;
  items: [
    {
      driverIntId: number;
      driverId: string;
      driverFullName: string;
      vehicleName: string;
      time: string;
      reportType: string;
      editable: boolean;
      driverDriverId: string;
      isUnofficial: boolean;
      id: string;
    }
  ];
}

export interface IRange {
  dateFrom: Date;
  dateTo: Date;
}

export interface ITenantLocalStorage {
  prologs: {
    id: string;
    name: string;
  };
}

export interface IEvent {
  id: number;
  dutyStatus: string;
  startTime: string;
  realStartTime?: string;
  endTime: string;
  durationInSeconds: number;
  realDurationInSeconds?: number;
  locationDisplayName?: string;
  notes?: string;
  engineMinutes?: number;
  odometer?: number;
  origin?: string;
  isBasic: boolean;
  vehicleName?: string;
  vehicleVin?: string;
  vehicleId: number;
  eventType: string;
  eventCode: number;
  attachedTrailers?: string;
  shippingDocuments?: string;
  realEndTime?: string;
  eventSequenceNumber?: string;
  elapsedEngineHours?: number;
  accumulatedVehicleMiles?: number;
  isEventMissingPowerUp: boolean;
  averageSpeed?: number;
  coDriverDisplayName: string;
  coDriverId: string;

  statusName: string;
  isTeleport: boolean;
  occurredDuringDriving: boolean;
  truckChange: boolean;
  viewId: number;
  error: boolean;
  errorMessage: string;
  computeIndex: number;
}

export interface IDriver {
  companyId: number;
  driverId: string;
  driverStatus: string;
  fullName: string;
  hasViolations: boolean;
  homeTerminalTimeZone: string;
  id: number;
  lastSync: string; //  Date.toISOString()
  mobileAppType: string;
  mobileAppVersion: string;
}

export interface ILog {
  totalCount: number;
  items: IDriver[];
}

export interface ICompany {
  id: string;
  name: string;
}

export interface ITenant extends ICompany {
  appUrl?: string;
  customerContactEmail?: string;
  customerContactName?: string;
  customerContactPhone?: string;
  domainName?: string;
  editable?: boolean;
  hasOwnElds?: boolean;
  parentTenantId?: string;
  webApiUrl?: string;
}

export interface IDetectedOnDuty {
  driverName: string;
  company: string;
  id: string;
  duration: { logged: number; real: number };
}

export interface IMalfOrDataDiagDetection {
  company: string;
  driverName: string;
  id: string;
}

export interface IAdvancedResaults {
  prolengedOnDuties: IDetectedOnDuty[];
  malfOrDataDiagDetection: IMalfOrDataDiagDetection[];
}
