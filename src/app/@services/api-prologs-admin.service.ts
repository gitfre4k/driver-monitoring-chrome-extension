import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { DateTime } from "luxon";

@Injectable({
  providedIn: "root",
})
export class ApiPrologsAdminService {
  private http: HttpClient = inject(HttpClient);

  getDashboardLocationsData() {
    const url =
      "https://api.prologs.us/api/app/dashboard/dashboardlocationsdata";

    return this.http.get(url, {
      withCredentials: true,
      headers: {
        "x-client-timezone": `${DateTime.local().zoneName}`,
      },
    });
  }
}
