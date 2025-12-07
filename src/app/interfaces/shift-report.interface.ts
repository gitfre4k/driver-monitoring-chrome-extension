import {
  IDriverFmcsaInspection,
  IVehicle,
} from "./driver-daily-log-events.interface";

export interface IRawBackendData {
  [key: number]: IRawData;
}

export interface IRawData {
  [tenantId: string]: {
    name: string;
    drivers: IRawDataDriver;
  };
}
export interface IRawDataDriver {
  [id: number]: {
    name: string;
    notes: IRawDataDriverNotes;
  };
}

export interface IRawDataDriverNotes {
  [stamp: string]: {
    note: string;
    part: number;
    eventId: number;
    vehicleData?: IVehicle | undefined | null;
  }[];
}

// ~~~~~~~~~~~~~~~~~~
export interface IMergedDriverNote {
  name: string;
  note: string;
  eventIds: number[];
  vehicleData?: IVehicle | undefined | null;
}

export interface IProcessedDrivers {
  [id: number]: {
    [stamp: string]: IMergedDriverNote;
  }[];
}

export interface IData {
  [tenantId: string]: {
    name: string;
    drivers: IProcessedDrivers;
  };
}
export interface IBackendData {
  [key: number]: IData;
}
