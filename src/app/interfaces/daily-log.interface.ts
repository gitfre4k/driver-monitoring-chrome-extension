import { ITenant } from '.';

export interface IDriverLogs {
  items: IDailyLog[];
  totalCount: number;
  // custom
  driverName: string;
  driverId: number;
  tenant: ITenant;
  zone: string;
}

export interface IDailyLog {
  id: string;
  distanceInMiles: number;
  timeWorked: string;
  minutesWorked: number;
  hasInspectionReport: boolean;
  defectsFound: boolean;
  certified: boolean;
  timeZoneOffset: number;
  violations: any[];
  // custom
  driverName: string;
  driverId: number;
  tenant: ITenant;
}
