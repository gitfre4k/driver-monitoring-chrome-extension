import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { DateTime } from "luxon";
import { UrlService } from "./url.service";
import { switchMap } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class ApiPrologsAdminService {
  private http: HttpClient = inject(HttpClient);
  private urlService = inject(UrlService);

  getDashboardLocationsData(
    tenantId: string = "3a1407a2-e95e-d3a3-1422-2251d0038a0e",
  ) {
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
        return this.http.get(url, {
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
