import { MatDialogRef } from "@angular/material/dialog";
import { TErrorParsedComparison } from "../types";

export interface IResizePayload {
  duration: string;
  durationAsTimeSpan: string;
}

export interface IParsedErrorInfo {
  miles: number;
  comparison: TErrorParsedComparison;
}

export interface IAdvancedResizePayload {
  resizePayload: IResizePayload;
  parsedErrorInfo: IParsedErrorInfo;
}

export interface IShiftInputState {
  direction: "Past" | "Future";
  time: string;
  dialogRef?: MatDialogRef<any, any>;
}
export interface IMinutesOutput {
  minutes: string;
}
export interface IHoursOutput {
  hours: string;
}

export interface IEventLocation {
  geolocation: string;
  latitude: string;
  locationSource: string;
  longitude: string;
}

export interface ILocationData {
  name: string;
  state: string;
  distance: number;
  direction: string;
  bearing: number;
}

export interface ISmartFixResponse {
  errorMessage: string;
  eventId: number;
  eventName: string;
  eventTime: string;
  ianaTimeZoneId: string;
}
