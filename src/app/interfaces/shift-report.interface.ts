import { IVehicle } from './driver-daily-log-events.interface';

export interface IBackendData {
  [key: number]: IData;
}

export interface IData {
  [tenantId: string]: {
    name: string;
    drivers: IDataDriver;
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
  }[];
}

const backemdData: IBackendData = {
  0: {},
};

backemdData[0]['3a158eba-3171-b188-86a5-809504f6b542'].drivers[60].notes;
