import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { DateTime } from "luxon";
import { UrlService } from "./url.service";
import { switchMap } from "rxjs";
import { IDriverVehicleStatus } from "../interfaces/dashboard-locations-data.interface";

@Injectable({
  providedIn: "root",
})
export class ApiPrologsAdminService {
  private http: HttpClient = inject(HttpClient);
  private urlService = inject(UrlService);

  getDashboardLocationsData(tenantId: string) {
    const urlAdminTenantToken = `https://api.prologs.us/api/app/tenant/acquiretenantadminaccesstoken`;
    const url = `https://api.prologs.us/api/app/dashboard/dashboardlocationsdata`;

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
          urlAdminTenantToken,
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
}
