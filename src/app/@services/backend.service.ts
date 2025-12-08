import { inject, Injectable, signal } from '@angular/core';
import { IEventDetails, ITenant } from '../interfaces';
import { DateTime } from 'luxon';
import { HttpClient } from '@angular/common/http';
import {
  IDriverDailyLogEvents,
  IVehicle,
} from '../interfaces/driver-daily-log-events.interface';
import { ApiService } from './api.service';
import { concatMap, from, map, Observable, Subscription } from 'rxjs';
import { IBackendData, IData } from '../interfaces/shift-report.interface';
import { ApiOperationsService } from './api-operations.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  url = 'https://app.monitoringdriver.com/api/Logs/CreateEvent';

  private http: HttpClient = inject(HttpClient);
  private apiService = inject(ApiService);
  private apiOperationsService = inject(ApiOperationsService);
  private _snackBar = inject(MatSnackBar);
  dataSubscription: Subscription | undefined;

  backendData = signal<IBackendData | null>(null);

  isLoadingShiftReport = signal(false);
  isDeletingNote = signal<string | null>(null);

  dataDate = '2025-09-01T04:00:00Z';

  constructor() {}

  loadShiftReport() {
    this.isLoadingShiftReport.set(true);
    this.dataSubscription = this.shiftReport$.subscribe({
      next: (value) => {
        console.log('FOKUMAAAAAAAAAAAAAAAAC !!! ', value);
        this.backendData.set(value);
      },
      error: (error) => {
        this.isLoadingShiftReport.set(false);
        this._snackBar.open(
          'Error loading shift report data: ' +
            (error.message ? error.message : error.error.message),
          'Close',
          {
            duration: 7000,
          },
        );
      },
      complete: () => {
        this.isLoadingShiftReport.set(false);
      },
    });
  }

  shiftReport$: Observable<IBackendData> = this.apiService
    .getDriverDailyLogEvents(
      2,
      this.dataDate,
      '3a0e2d3b-8214-edb4-c139-0d55051fc170',
    )
    .pipe(
      map((ddle) => {
        const events = ddle.events;

        const shiftReport = {} as IData;
        const problems = {} as IData;
        const fmscaInspections = {} as IData;

        events.forEach((event) => {
          let state: IData;
          switch (event.dutyStatus) {
            case 'ChangeToOffDutyStatus':
              state = shiftReport;
              break;
            case 'ChangeToSleeperBerthStatus':
              state = problems;
              break;
            case 'ChangeToOnDutyNotDrivingStatus':
              state = fmscaInspections;
              break;
            default:
              state = shiftReport;
          }

          if (event.notes === 'BACKEND__START') return;

          // 1. Ensure tenant structure exists (Initialization)
          const dataInfo = JSON.parse(event.shippingDocuments);
          const tenant = dataInfo.tenant;
          const vehicleData = dataInfo.vehicleData;
          if (!state[tenant.id]) {
            state[tenant.id] = {
              name: tenant.name,
              drivers: {}, // Initialize drivers as an empty object
            };
          }

          // 2. Extract common data
          const currentNote = {
            note: event.notes,
            part: event.engineMinutes,
            eventId: event.id,
            vehicleData,
          };
          const driverId = event.odometer;
          const stamp = event.attachedTrailers;
          const tenantReport = state[tenant.id];

          // 3. Ensure driver structure exists (Initialization)
          if (!tenantReport.drivers[driverId]) {
            tenantReport.drivers[driverId] = {
              name: event.locationDisplayName,
              notes: {}, // Initialize notes as an empty object
            };
          }

          const driverNotes = tenantReport.drivers[driverId].notes;

          // 4. Update the notes array for the stamp
          if (driverNotes[stamp]) {
            driverNotes[stamp].push(currentNote);
          } else {
            driverNotes[stamp] = [currentNote];
          }
        });

        return { 0: shiftReport, 1: problems, 2: fmscaInspections };
      }),
    );

  uploadData = (
    tenant: ITenant,
    driver: IDriverDailyLogEvents,
    note: string,
    eventTypeCode:
      | 'ChangeToOffDutyStatus'
      | 'ChangeToSleeperBerthStatus'
      | 'ChangeToOnDutyNotDrivingStatus',
    vehicleData?: IVehicle | null,
  ) => {
    const dataInfo = {
      tenant: { id: tenant.id, name: tenant.name },
      vehicleData,
    };

    const chunks = note.match(/.{1,50}/g);

    const transformedChunks = chunks!.map((chunk, index) => {
      const part = index + 1;
      return [part, chunk] as [number, string];
    });

    const stamp = DateTime.now().toUTC().toISO();

    return from(transformedChunks).pipe(
      concatMap((notePart) => {
        const body: Partial<IEventDetails> = {
          note: notePart[1],
          eventTypeCode,
          startTime: this.randomTime(),
          shippingDocumentNumber: JSON.stringify(dataInfo),
          totalVehicleMiles: driver.driverId,
          totalEngineHours: notePart[0],
          trailerNumbers: stamp,
          locationSource: 'SelectedFromMap',
          latitude: '31.279850',
          longitude: '-98.454710',
          geolocation: driver.driverFullName,
          eventSequenceIdNumber: '1',
          vehicleId: 2,
          driverId: 2,
        };

        return this.http.post<IEventDetails>(this.url, body, {
          withCredentials: true,
          headers: {
            'X-Tenant-Id': '3a0e2d3b-8214-edb4-c139-0d55051fc170',
            'x-client-timezone': `${DateTime.local().zoneName}`,
          },
        });
      }),
    );
  };

  deleteNote(eventIds: number[]) {
    return this.apiOperationsService.deleteEvents(
      { id: '3a0e2d3b-8214-edb4-c139-0d55051fc170' } as ITenant,
      [...eventIds],
    );
  }

  randomTime() {
    // The maximum number of milliseconds in 24 hours (8.64e+7)
    const MAX_MS_IN_24_HOURS = 86400000;

    // Generate a random number between 0 (inclusive) and MAX_MS_IN_24_HOURS (exclusive)
    const randomMs = Math.floor(Math.random() * MAX_MS_IN_24_HOURS);

    // Define the fixed starting date string
    const startDateString = this.dataDate;

    // 1. Parse the base date string. We specify the time zone as 'utc'
    // to correctly handle the 'Z' (Zulu/UTC) time zone indicator.
    const startDate = DateTime.fromISO(startDateString, { zone: 'utc' });

    if (!startDate.isValid) {
      console.error('Failed to parse start date:', startDate.invalidReason);
      return 'ERROR: Invalid Date';
    }

    // 2. Add the random duration (in milliseconds)
    const newDate = startDate.plus({ milliseconds: randomMs });

    // 3. Return the new DateTime object formatted back as an ISO string (keeping the UTC zone)
    return newDate.toISO({ includeOffset: true });
  }
}

// export interface IViolations {
//   company: ITenant;
//   totalCount: number;
//   items: {
//     id: number;
//     driverId: string;
//     driverName: string;
//     violationsCount: number;
//     violations: {
//       violationId: string;
//       type: string;
//       startTime: string;
//       endTime: string;
//       logDate: string;
//       homeTerminalTimeZone: string;
//     }[];
//   }[];
// }

// {
//   id: 20599,
//   eventUuid: "3a1cfff0-eeda-d2f2-0456-bf04a2fd4685",
//   eventTypeCode: "ChangeToOffDutyStatus",
//   startTime: "2025-10-31T23:00:00Z",
//   vehicleId: 2,
//   driverId: 2,
//   shippingDocumentNumber: "shesquilla kompira",
//   eventSequenceIdNumber: "FFE1",
//   accumulatedVehicleMiles: 91,
//   totalVehicleMiles: 4382,
//   elapsedEngineHours: 2,
//   totalEngineHours: 154.1,
//   locationSource: "SelectedFromMap",
//   latitude: "31.279850",
//   longitude: "-98.454710",
//   geolocation: "22mi NW Lampasas, TX",
//   countryId: 1,
//   stateId: 48,
//   trailerNumbers: "BATMOBILE",
//   note: "",
// },

////////////////
// IEventDetails

// accumulatedVehicleMiles: number;
// countryId: number;
// driverId: number;
// driversLocationDescription: string;
// elapsedEngineHours: number;
// eventSequenceIdNumber: string;
// eventTypeCode: TEventTypeCode;
// | 'ChangeToOffDutyStatus'
// | 'ChangeToSleeperBerthStatus'
// | 'ChangeToDrivingStatus'
// | 'ChangeToOnDutyNotDrivingStatus'
// | 'IntermediateLogConventionalLocationPrecision'
// | 'IntermediateLogReducedLocationPrecision'
// | 'EnginePowerUpConventionalLocationPrecision'
// | 'EnginePowerUpReducedLocationPrecision'
// | 'EngineShutDownConventionalLocationPrecision'
// | 'EngineShutDownReducedLocationPrecision'

// startTime: string;
// eventUuid: string;
// id: number;
// geolocation: string;
// latitude: string;
// locationSource: string;
// longitude: string;
// note: string;
// shippingDocumentNumber: string;
// stateId: number;
// totalEngineHours: number;
// totalVehicleMiles: number;
// trailerNumbers: string;
// vehicleId: number;
