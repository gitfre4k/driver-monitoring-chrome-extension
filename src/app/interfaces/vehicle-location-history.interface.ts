export interface IVehicleLocationHistory {
  vehicleId: number;
  vehicleName: string;
  homeTerminalTimeZone: string;
  drivingSpeedUnit: string;
  startOfDay: string;
  locations: ILocationData[];
}

export interface ILocationData {
  lat: number;
  lng: number;
  headingDirection: string | null;
  bearing: number;
  drivingSpeed: number | null;
  timeStamp: string;
  geolocation: string;
  driverDisplayName: string;
  attachedTrailers: string;
  vehicleOdometer: number;
}
