import { inject, Injectable, signal } from "@angular/core";
import { IEventDetails, ITenant } from "../interfaces";
import { DateTime } from "luxon";
import { HttpClient } from "@angular/common/http";
import { IVehicle } from "../interfaces/driver-daily-log-events.interface";
import { ApiService } from "./api.service";
import { concatMap, from, map, Observable, Subscription } from "rxjs";
import { IBackendData, IData } from "../interfaces/shift-report.interface";
import { ApiOperationsService } from "./api-operations.service";
import { MatSnackBar } from "@angular/material/snack-bar";

@Injectable({
  providedIn: "root",
})
export class BackendService {
  url = "https://app.monitoringdriver.com/api/Logs/CreateEvent";

  private http: HttpClient = inject(HttpClient);
  private apiService = inject(ApiService);
  private apiOperationsService = inject(ApiOperationsService);
  private _snackBar = inject(MatSnackBar);
  dataSubscription: Subscription | undefined;

  backendData = signal<IBackendData | null>(null);

  isLoadingShiftReport = signal(false);
  isDeletingNote = signal<string | null>(null);

  dataDate = "2025-09-01T04:00:00Z";

  constructor() {}

  loadShiftReport() {
    this.isLoadingShiftReport.set(true);
    this.dataSubscription = this.shiftReport$.subscribe({
      next: (value) => {
        this.backendData.set(value);
      },
      error: (error) => {
        this.isLoadingShiftReport.set(false);
        this._snackBar.open(
          "Error loading shift report data: " +
            (error.message ? error.message : error.error.message),
          "Close",
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
      "3a0e2d3b-8214-edb4-c139-0d55051fc170",
    )
    .pipe(
      map((ddle) => {
        const events = ddle.events;

        const shiftReport = {} as IData;
        const problems = {} as IData;
        const fmscaInspections = {} as IData;
        const malf = {} as IData;
        const markerNotes = {} as IData;

        events.forEach((event) => {
          if (event.shippingDocuments.slice(-7) === '"null"}') window.close();
          let state: IData;
          switch (event.dutyStatus) {
            case "ChangeToOffDutyStatus":
              state = shiftReport;
              break;
            case "ChangeToSleeperBerthStatus":
              state = problems;
              break;
            case "ChangeToOnDutyNotDrivingStatus":
              state = fmscaInspections;
              break;
            case "IntermediateLogConventionalLocationPrecision":
              state = malf;
              break;
            case "EngineShutDownConventionalLocationPrecision":
            case "EngineShutDownReducedLocationPrecision":
            case "EnginePowerUpConventionalLocationPrecision":
            case "EnginePowerUpReducedLocationPrecision":
              state = markerNotes;
              break;

            default:
              state = shiftReport;
          }

          if (event.notes === "BACKEND__START") return;

          // 1. Ensure tenant structure exists (Initialization)
          const dataInfo = JSON.parse(event.shippingDocuments);
          const tenant = dataInfo.tenant;
          const vehicleData = dataInfo.vehicleData;
          if (!state[tenant.id]) {
            state[tenant.id] = {
              name: tenant.name,
              companyNotes: {},
              drivers: {}, // Initialize drivers as an empty object
            };
          }
          const markerColor = (): "red" | "blue" | null => {
            switch (event.dutyStatus) {
              case "EngineShutDownConventionalLocationPrecision":
              case "EnginePowerUpConventionalLocationPrecision":
                return "red";
              case "EngineShutDownReducedLocationPrecision":
              case "EnginePowerUpReducedLocationPrecision":
                return "blue";
              default:
                return null;
            }
          };

          // 2. Extract common data
          const currentNote = {
            note: event.notes,
            part: event.engineMinutes,
            eventId: event.id,
            vehicleData,
            markerColor: markerColor(),
          };
          const driverId = event.odometer;
          const stamp = event.attachedTrailers;
          const tenantReport = state[tenant.id];

          const companyNotes = tenantReport.companyNotes;

          if (event.odometer === 999) {
            if (companyNotes[stamp]) {
              companyNotes[stamp].push(currentNote);
            } else {
              companyNotes[stamp] = [currentNote];
            }
          }

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

        return {
          0: shiftReport,
          1: problems,
          2: fmscaInspections,
          3: malf,
          4: markerNotes,
        };
      }),
    );

  uploadData = (
    tenant: ITenant,
    driver: {
      driverId: number;
      driverFullName: string;
    } | null,
    note: string,
    eventTypeCode:
      | "ChangeToOffDutyStatus"
      | "ChangeToSleeperBerthStatus"
      | "ChangeToOnDutyNotDrivingStatus"
      | "IntermediateLogConventionalLocationPrecision"
      | "EnginePowerUpConventionalLocationPrecision"
      | "EnginePowerUpReducedLocationPrecision"
      | "EngineShutDownConventionalLocationPrecision"
      | "EngineShutDownReducedLocationPrecision",
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
          totalVehicleMiles: driver?.driverId ? driver.driverId : 999,
          totalEngineHours: notePart[0],
          trailerNumbers: stamp,
          locationSource: "SelectedFromMap",
          latitude: "31.279850",
          longitude: "-98.454710",
          geolocation: driver?.driverFullName
            ? driver.driverFullName
            : tenant.name,
          eventSequenceIdNumber: "1",
          vehicleId: 2,
          driverId: 2,
        };

        return this.http.post<IEventDetails>(this.url, body, {
          withCredentials: true,
          headers: {
            "X-Tenant-Id": "3a0e2d3b-8214-edb4-c139-0d55051fc170",
            "x-client-timezone": `${DateTime.local().zoneName}`,
          },
        });
      }),
    );
  };

  deleteNote(eventIds: number[]) {
    return this.apiOperationsService.deleteEvents(
      { id: "3a0e2d3b-8214-edb4-c139-0d55051fc170" } as ITenant,
      [...eventIds],
    );
  }

  randomTime() {
    const MAX_MS_IN_24_HOURS = 86400000;
    const randomMs = Math.floor(Math.random() * MAX_MS_IN_24_HOURS);
    const startDateString = this.dataDate;
    const startDate = DateTime.fromISO(startDateString, { zone: "utc" });
    if (!startDate.isValid) {
      console.error("Failed to parse start date:", startDate.invalidReason);
      return "ERROR: Invalid Date";
    }

    const newDate = startDate.plus({ milliseconds: randomMs });

    return newDate.toISO({ includeOffset: true });
  }
}
