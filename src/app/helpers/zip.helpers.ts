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

export const getRangeDuration = (start: string, end: string) => {
  const date1 = DateTime.fromISO(start);
  const date2 = DateTime.fromISO(end);

  const diffDuration = date2.diff(date1, ["hours", "minutes"]);

  const hours = Math.floor(diffDuration.hours);
  const minutes = Math.floor(diffDuration.minutes % 60);

  const formattedHours = String(hours).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}`;
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

const formatMinutesToTime = (totalMinutes: number): string => {
  const duration = Duration.fromObject({ minutes: totalMinutes });
  return duration.toFormat("hh:mm");
};

export const subtractTimes = (time1Str: string, time2Str: string) => {
  const [hours1, minutes1] = time1Str.split(":").map(Number);
  const [hours2, minutes2] = time2Str.split(":").map(Number);

  const totalMinutes1 = hours1 * 60 + minutes1;
  const totalMinutes2 = hours2 * 60 + minutes2;

  const differenceInMinutes = totalMinutes1 - totalMinutes2;

  return formatMinutesToTime(differenceInMinutes);
};
