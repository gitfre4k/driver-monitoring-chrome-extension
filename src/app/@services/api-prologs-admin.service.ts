import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { DateTime } from "luxon";
import { UrlService } from "./url.service";
import { switchMap } from "rxjs";
import { IDriverVehicleStatus } from "../interfaces/dashboard-locations-data.interface";
import { IVehicleMaintenance } from "../interfaces/vehicle-maintenance.interface";
import { IVehicleLocationHistory } from "../interfaces/vehicle-location-history.interface";

@Injectable({
  providedIn: "root",
})
export class ApiPrologsAdminService {
  private http: HttpClient = inject(HttpClient);
  private urlService = inject(UrlService);
  urlAdminTenantToken = `https://api.prologs.us/api/app/tenant/acquiretenantadminaccesstoken`;

  // acquire tenant admin token

  acquireTenantAdminToken(tenantId: string) {
    return this.urlService.onGetAdminProLogsToken().pipe(
      switchMap((token) => {
        const body = {
          id: tenantId,
          requestedScopes: [
            "openid",
            "profile",
            "email",
            "offline_access",
            "EldApi",
            "role",
          ],
        };
        return this.http.post<{ accessToken: string }>(
          this.urlAdminTenantToken,
          body,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`,
              "x-client-timezone": `${DateTime.local().zoneName}`,
            },
          },
        );
      }),
    );
  }

  // dashboard loc data
  getDashboardLocationsData(tenantId: string) {
    const url = `https://api.prologs.us/api/app/dashboard/dashboardlocationsdata`;

    return this.acquireTenantAdminToken(tenantId).pipe(
      switchMap(({ accessToken }) => {
        return this.http.get<IDriverVehicleStatus[]>(url, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-client-timezone": `${DateTime.local().zoneName}`,
          },
        });
      }),
    );
  }

  // vehicle maintenance
  getVehicleMaintenance(tenantId: string, vehicleId: number) {
    const url = `https://api.prologs.us/api/app/maintenancedashboard/${vehicleId}/vehicle`;

    return this.acquireTenantAdminToken(tenantId).pipe(
      switchMap(({ accessToken }) => {
        return this.http.get<IVehicleMaintenance>(url, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-client-timezone": `${DateTime.local().zoneName}`,
          },
        });
      }),
    );
  }

  // vehicle location history
  getVehicleLocationHistory(tenantId: string, vehicleId: number) {
    const url = `https://api.prologs.us/api/app/location/vehicle-location-history?vehicleId=${vehicleId}&date=${DateTime.now().toUTC().toISO()}`;

    // IVehicleLocationHistory

    return this.acquireTenantAdminToken(tenantId).pipe(
      switchMap(({ accessToken }) => {
        return this.http.get<IVehicleLocationHistory>(url, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-client-timezone": `${DateTime.local().zoneName}`,
          },
        });
      }),
    );
  }
}
