import { ProgressBarMode } from '@angular/material/progress-bar';

export interface IViolations {
  totalCount: number;
  items: [
    {
      id: number;
      driverId: string;
      driverName: string;
      violationsCount: number;
      violations: [
        {
          violationId: string;
          type: string;
          startTime: string;
          endTime: string;
          logDate: string;
          homeTerminalTimeZone: string;
        }
      ];
    }
  ];
}

export interface ICompany {
  id: string;
  name: string;
}

export interface IProgressBar {
  mode: ProgressBarMode;
  value: number;
  bufferValue: number;
  constant: number;
  currentCompany: string;
  totalCount: number;
}

export interface IScanViolations {
  company: string;
  violations: IViolations;
}

export interface IScanErrors {
  error: { name: string; message: string };
  company: ICompany;
}
