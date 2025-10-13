import { DateTime, Duration } from "luxon";
import { IEvent } from "../interfaces/driver-daily-log-events.interface";

export const getTime = (event: IEvent) => {
  return DateTime.fromISO(event.realStartTime).toJSDate().getTime();
};

export const getDuration = (seconds: number) =>
  Duration.fromObject({ seconds }).toFormat("hh:mm:ss");

export const getRandomIntInclusive = (min: number, max: number) => {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);

  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
};

export const timeToSeconds = (time: string) => {
  const parts = time.split(":");
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  return minutes * 60 + seconds;
};

export const dutyStatusNames = new Set([
  "On Duty",
  "Sleeper Berth",
  "Off Duty",
  "Driving",
]);

export const deletableStatusNames = new Set([
  "Engine On",
  "Engine Off",
  "Login",
  "Logout",
  "DVIR",
  "Diagnostic",
  "Diag. CLR",
]);

export const getMinusOneToTwoSecDateISO = (date: string) => {
  return (DateTime.fromISO(date) as DateTime<true>)
    .minus({ seconds: 1 })
    .minus({ milliseconds: getRandomIntInclusive(1, 1000) })
    .toUTC()
    .toISO();
};
