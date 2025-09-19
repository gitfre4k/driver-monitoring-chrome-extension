import { DateTime, Duration } from 'luxon';
import { IEvent } from '../interfaces/driver-daily-log-events.interface';

export const getTime = (event: IEvent) => {
  return DateTime.fromISO(event.realStartTime).toJSDate().getTime();
};

export const getDuration = (seconds: number) =>
  Duration.fromObject({ seconds }).toFormat('hh:mm:ss');

export const getRandomIntInclusive = (min: number, max: number) => {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);

  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
};
