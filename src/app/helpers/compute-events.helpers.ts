import { DateTime } from "luxon";
import {
  IDriverFmcsaInspection,
  IEvent,
} from "../interfaces/driver-daily-log-events.interface";

export const isEventLocked = (
  event: IEvent,
  fmcsaInspection: IDriverFmcsaInspection,
) => {
  if (!fmcsaInspection) return false;

  const dotFrom = DateTime.fromISO(fmcsaInspection.reportTimeFrom);
  const dotTo = DateTime.fromISO(fmcsaInspection.reportTimeTo);
  const eventStartTime = DateTime.fromISO(event.startTime);

  if (eventStartTime >= dotFrom && eventStartTime <= dotTo) return true;
  else return false;
};
