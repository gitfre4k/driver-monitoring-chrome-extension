import {
  IDriverFmcsaInspection,
  IVehicle,
} from "../interfaces/driver-daily-log-events.interface";

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

export const getNote = (
  array: { note: string; part: number; eventId: number }[],
) => {
  const sortedParts = sortArrayByPart(array);

  let note = "";
  sortedParts.forEach((part) => (note += part.note));

  return note;
};

export const parseDOTInspection = (
  array: { note: string; part: number; eventId: number }[],
) => {
  const rawDOT = sortArrayByPart(array);
  let message = "";

  rawDOT.forEach((part) => (message += part.note));

  return JSON.parse(message) as IDriverFmcsaInspection;
};

export const parseMalf = (note: string) => {
  return JSON.parse(note) as { start: string; end: string; note: string };
};
