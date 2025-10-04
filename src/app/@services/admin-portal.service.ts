import { inject, Injectable } from "@angular/core";
import { from, mergeMap, switchMap } from "rxjs";
import { ApiService } from "./api.service";
import { ApiPrologsAdminService } from "./api-prologs-admin.service";
import { ConstantsService } from "./constants.service";

@Injectable({
  providedIn: "root",
})
export class AdminPortalService {
  apiService = inject(ApiService);
  apiPrologsAdminService = inject(ApiPrologsAdminService);
  constantService = inject(ConstantsService);

  httpLimit = this.constantService.httpLimit;

  scanAdminPortal() {
    return this.apiService.getAccessibleTenants().pipe(
      switchMap((tenants) => from(tenants)),
      mergeMap((tenant) => {
        return this.apiPrologsAdminService.getDashboardLocationsData(tenant.id);
      }, this.httpLimit()),
    );
  }
}
