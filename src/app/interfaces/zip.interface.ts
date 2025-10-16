import { IEvent } from "./driver-daily-log-events.interface";

export interface IResizeItem {
  event: IEvent;
  duration: string;
  duplicateForGapFillEvent: false | IEvent;
}
