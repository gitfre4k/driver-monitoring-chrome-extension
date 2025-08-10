import { ProgressBarMode } from '@angular/material/progress-bar';
import { IEvent as ICEvent } from '../interfaces/driver-daily-log-events.interface';

export interface IViolations {
  company: ITenant;
  totalCount: number;
  items: {
    id: number;
    driverId: string;
    driverName: string;
    violationsCount: number;
    violations: {
      violationId: string;
      type: string;
      startTime: string;
      endTime: string;
      logDate: string;
      homeTerminalTimeZone: string;
    }[];
  }[];
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
  violations: IViolations;
}

export interface IScanDOTInspections {
  inspections: IDOTInspections;
}

export interface IScanErrors {
  error: { name: string; message: string };
  company: ITenant;
  driverName?: string;
}

export interface IDOTInspections {
  company: ITenant;
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

export interface IDriver {
  companyId: number;
  driverId: string;
  driverStatus: string;
  fullName: string;
  hasViolations: boolean;
  homeTerminalTimeZone: string;
  id: number;
  lastSync: string;
  mobileAppType: string;
  mobileAppVersion: string;
  tenant?: ITenant;
}

export interface ILog {
  totalCount: number;
  items: IDriver[];
  tenant?: ITenant;
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

export interface IScanResult {
  [company: string]: IScanResultDriver[];
}
export interface IScanResultDriver {
  driverName: string;
  events: ICEvent[];
}

export interface IEventDetails {
  accumulatedVehicleMiles: number;
  countryId: number;
  driverId: number;
  driversLocationDescription: string;
  elapsedEngineHours: number;
  eventSequenceIdNumber: string;
  eventTypeCode: string;
  eventUuid: string;
  geolocation: string;
  id: number;
  latitude: string;
  locationSource: string;
  longitude: string;
  note: string;
  shippingDocumentNumber: string;
  startTime: string;
  stateId: number;
  totalEngineHours: number;
  totalVehicleMiles: number;
  trailerNumbers: string;
  vehicleId: number;
}
