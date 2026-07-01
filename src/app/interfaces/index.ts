import { ProgressBarMode } from '@angular/material/progress-bar';
import { IEvent as ICEvent } from '../interfaces/driver-daily-log-events.interface';
import { IDailyLog } from './daily-log.interface';
import { TEventTypeCode } from '../types';

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
  /** Context needed to replay only this failed request (Driver Log Analysis):
   *  the driver whose daily-log fetch failed and the date queried. */
  driver?: { id: number; fullName: string };
  date?: string;
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
    },
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
  // custom
  offSet?: number;
}

export interface IScanResult {
  [company: string]: IScanResultDriver[];
}
export interface IScanResultDriver {
  driverName: string;
  events: ICEvent[];
}
export interface IScanAdminPortalResult {
  [company: string]: Partial<IScanAdminPortalResultDriver>[];
}

export interface IScanAdminPortalResultDriver {
  driverName: string;
  driverId: number;
  tenant: ITenant;
  dutyStatus: string;
  drivingSpeed: number;
  drivingSpeedUnit: string;
  location: string;
  vehicleName: string;
  isPlugged: boolean;
  lastTimestamp: string;
  lastActivity: number;
}

export interface IEventDetails {
  accumulatedVehicleMiles: number;
  countryId: number;
  driverId: number;
  driversLocationDescription: string;
  elapsedEngineHours: number;
  eventSequenceIdNumber: string;
  eventTypeCode: TEventTypeCode;
  startTime: string;
  eventUuid: string;
  id: number;
  geolocation: string;
  latitude: string;
  locationSource: string;
  longitude: string;
  note: string;
  shippingDocumentNumber: string;
  stateId: number;
  totalEngineHours: number;
  totalVehicleMiles: number;
  trailerNumbers: string;
  vehicleId: number;
}

export interface IIdMismatch {
  [company: string]: IIdMismatchDriver[];
}

export interface IIdMismatchDriver {
  driverName: string;
  driverViewId: string;
  driverId: number;
  vehicleViewId: string;
  tenant: ITenant;
}

export interface ICertStatus {
  [company: string]: ICertStatusDriver[];
}
export interface ICertStatusDriver {
  driverName: string;
  driverId: number;
  uncertifiedDays: IDailyLog[];
  zone: string;
  tenant: ITenant;
}

export interface ISmartFixResult {
  [company: string]: ISmartFixResultDriver[];
}

export interface ISmartFixResultDriver {
  driverName: string;
  driverId: number;
  tenant: ITenant;
  errorMessage: string;
}

export interface IISODateRange {
  from: string;
  to: string;
}

/** One classified category inside a multi-day monitor analysis, rendered as a
 *  plain-text title + its events (no nested accordions). */
export interface IMonitorAnalysisCategory {
  /** Category bucket key (e.g. `teleports`) — selects the shared row template. */
  key: string;
  title: string;
  events: ICEvent[];
}

/** Shipping documents that stayed unchanged across a run of consecutive days.
 *  3–4 days → warning, 5+ days → error. */
export interface IMonitorAnalysisShippingFlag {
  docs: string[];
  days: number;
  level: 'warning' | 'error';
}

/** Uncertified log days found across the analysed range (cert-scan logic).
 *  1 day → warning, 2+ days → error. */
export interface IMonitorAnalysisCertFlag {
  dates: string[];
  level: 'warning' | 'error';
}

/** Result of a monitor-mode Driver Log Analysis over a date range — the single
 *  `[N day(s) analysis]: Driver Name` section, replaced on every run. */
export interface IMonitorAnalysis {
  days: number;
  driverName: string;
  driverId: number;
  company: string;
  tenant: ITenant;
  date: string;
  categories: IMonitorAnalysisCategory[];
  unchangedShippingDocs: IMonitorAnalysisShippingFlag | null;
  uncertifiedDays: IMonitorAnalysisCertFlag | null;
}
