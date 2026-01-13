import { IVehicle } from './driver-daily-log-events.interface';

export interface IBackendData {
  [key: number]: IData;
  customNotes: IDataDriverNotes;
}

export interface IData {
  [tenantId: string]: {
    name: string;
    drivers: IDataDriver;
    companyNotes: IDataDriverNotes;
  };
}
export interface IDataDriver {
  [id: number]: {
    name: string;
    notes: IDataDriverNotes;
  };
}

export interface IDataDriverNotes {
  [stamp: string]: {
    note: string;
    part: number;
    eventId: number;
    vehicleData?: IVehicle | undefined | null;
    markerColor?: 'red' | 'blue' | null;
  }[];
}

export type TSortedNotes = [key: string, data: ISortedCompanyNotes][];

export interface ISortedCompanyNotes {
  name: string;
  drivers: IDataDriver;
  companyNotes: IDataDriverNotes;
}
