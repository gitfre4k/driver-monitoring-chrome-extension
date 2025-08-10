import { ITenant } from '.';

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
  tenant: ITenant;
}
