import { IEvent } from "./driver-daily-log-events.interface";

export interface IResizeItem {
  event: IEvent;
  duration: string;
  duplicateForGapFillEvent: false | IEvent;
}

export interface IZipInitializationData {
  zipEvents: IEvent[];
  startTime: number;
  endTime: number;
  selectedRangeDuration: {
    shift: string;
    drive: string;
  };
  eventsToDelete: IEvent[];
  eventsWithPotentialGaps: { [id: string]: IEvent };
}

export interface IZipTask {
  time: string;
  isDone?: boolean | null;
  canceled?: boolean;
}
