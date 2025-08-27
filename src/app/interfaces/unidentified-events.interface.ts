export interface IUnidentifiedEvents {
  id: number;
  vehicleId: number;
  vehicleName: string;
  startLocation: string;
  startTime: string;
  duration: string;
  endLocation: string;
  homeTerminalTimeZone: string;
  distance: number;
}

export interface IUnidentifiedEventsData {
  totalCount: number;
  items: IUnidentifiedEvents[];
}
