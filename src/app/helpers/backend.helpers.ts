import {
  IDriverFmcsaInspection,
  IVehicle,
} from '../interfaces/driver-daily-log-events.interface';

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
  if (!array || array.length === 0) {
    return '';
  }

  const sortedParts = sortArrayByPart(array);

  let note = '';
  sortedParts.forEach((part) => (note += part.note));

  return note;
};

export const parseDOTInspection = (
  array: { note: string; part: number; eventId: number }[],
) => {
  const rawDOT = sortArrayByPart(array);
  let message = '';

  rawDOT.forEach((part) => (message += part.note));

  return JSON.parse(message) as IDriverFmcsaInspection;
};

export const parseMalf = (note: string) => {
  return JSON.parse(note) as { start: string; end: string; note: string };
};

/**
 * Safe variants used in the Cloud view: when a note is corrupted (an event
 * part is missing so the concatenated payload is not valid JSON), `JSON.parse`
 * throws. These return `null` instead so the template can render a "fix"
 * prompt rather than crashing the whole section.
 */
export const tryParseDOTInspection = (
  array: { note: string; part: number; eventId: number }[],
): IDriverFmcsaInspection | null => {
  try {
    return parseDOTInspection(array);
  } catch {
    return null;
  }
};

export const tryParseMalf = (
  note: string,
): { start: string; end: string; note: string } | null => {
  try {
    return parseMalf(note);
  } catch {
    return null;
  }
};
