import { IVehicle } from "../interfaces/driver-daily-log-events.interface";

export const sortArrayByPart = (
  array: {
    note: string;
    part: number;
    eventId: number;
    vehicleData?: IVehicle | undefined | null;
  }[],
) => {
  return array.sort((a, b) => a.part - b.part);
};
