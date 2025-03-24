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

export interface IScanDOTInspections {
  company: string;
  inspections: IDOTInspections;
}

export interface IScanErrors {
  error: { name: string; message: string };
  company: ICompany;
}

export interface IDOTInspections {
  totalCount: number;
  items: [
    {
      driverIntId: number;
      driverId: string;
      driverFullName: string;
      vehicleName: string;
      time: string;
      reportType: string;
      editable: boolean;
      driverDriverId: string;
      isUnofficial: boolean;
      id: string;
    }
  ];
}

export interface IRange {
  dateFrom: Date;
  dateTo: Date;
}

// {
//   "totalCount": 2,
//   "items": [
//       {
//           "driverIntId": 1,
//           "driverId": "0010",
//           "driverFullName": "Muhumed  Mohamud Said",
//           "vehicleName": "010",
//           "time": "2025-03-17T14:39:43.279768Z",
//           "reportType": "Web",
//           "editable": false,
//           "driverDriverId": "0010",
//           "isUnofficial": false,
//           "id": "3a18b6b8-b0af-da51-b6a2-b52ad6bfb9df"
//       },
//       {
//           "driverIntId": 1,
//           "driverId": "0010",
//           "driverFullName": "Muhumed  Mohamud Said",
//           "vehicleName": "010",
//           "time": "2025-03-17T14:48:57.539839Z",
//           "reportType": "Web",
//           "editable": false,
//           "driverDriverId": "0010",
//           "isUnofficial": false,
//           "id": "3a18b6c1-25c3-d031-d2fc-01cd606a4adc"
//       }
//   ]
// }
