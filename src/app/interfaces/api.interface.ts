import { TErrorParsedComparison } from '../types';

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
