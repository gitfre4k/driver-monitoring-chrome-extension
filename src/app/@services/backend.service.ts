import { inject, Injectable } from "@angular/core";
import { IEventDetails, ITenant } from "../interfaces";
import { DateTime } from "luxon";
import { HttpClient } from "@angular/common/http";
import { AppService } from "./app.service";

@Injectable({
  providedIn: "root",
})
export class BackendService {
  url = "https://app.monitoringdriver.com/api/Logs/CreateEvent";

  private http: HttpClient = inject(HttpClient);
  private appService = inject(AppService);

  addNote = (tenant: ITenant) => {
    const allTenants = this.appService.tenantsSignal();

    const tenantInfo = { id: tenant.id, name: tenant.name };

    const body: Partial<IEventDetails> = {
      note: "JSON.stringify(tenantInfo)",
      eventTypeCode: "ChangeToOffDutyStatus",
      startTime: "2025-11-01T04:00:00Z",
      shippingDocumentNumber: "",
      totalVehicleMiles: 1,
      totalEngineHours: 1,
      trailerNumbers: "",
      locationSource: "SelectedFromMap",
      latitude: "31.279850",
      longitude: "-98.454710",
      geolocation: JSON.stringify(tenantInfo),
      eventSequenceIdNumber: "0",
      vehicleId: 2,
      driverId: 2,
      // accumulatedVehicleMiles: 0,
      // elapsedEngineHours: 0,
    };

    return this.http.post<IEventDetails>(this.url, body, {
      withCredentials: true,
      headers: {
        "X-Tenant-Id": "3a0e2d3b-8214-edb4-c139-0d55051fc170",
        "x-client-timezone": `${DateTime.local().zoneName}`,
      },
    });
  };
}

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
