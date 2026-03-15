import { inject, Injectable } from '@angular/core';
import { from, map, mergeMap, switchMap, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ApiPrologsAdminService } from './api-prologs-admin.service';
import { ConstantsService } from './constants.service';
import { DateService } from './date.service';
import { ProgressBarService } from './progress-bar.service';
import { IScanAdminPortalResultDriver, ITenant } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class AdminPortalService {
  apiService = inject(ApiService);
  apiPrologsAdminService = inject(ApiPrologsAdminService);
  constantService = inject(ConstantsService);
  dateService = inject(DateService);
  progressBarService = inject(ProgressBarService);

  httpLimit = this.constantService.httpLimit;

  // dashboard
  scanAdminPortal() {
    this.progressBarService.initializeState('admin');
    this.progressBarService.scanning.set(true);

    return this.apiService.getAccessibleTenants().pipe(
      switchMap((tenants) => from(tenants)),
      mergeMap((tenant) => {
        this.progressBarService.currentCompany.set(tenant.name);
        this.progressBarService.progressValue.update(
          (value) => value + this.progressBarService.constant(),
        );

        return this.apiPrologsAdminService
          .getDashboardLocationsData(tenant.id)
          .pipe(
            tap({
              error: (error) => {
                this.progressBarService.progressValue.update(
                  (value) => value + this.progressBarService.constant(),
                );
                this.progressBarService.adminErrors.update((prev) => [
                  ...prev,
                  {
                    error,
                    company: tenant,
                  },
                ]);
              },
            }),

            map((data) => ({ vehicles: data, tenant })),
          );
      }, this.httpLimit()),
      tap((result) => {
        const tenantResult: IScanAdminPortalResultDriver[] = [];
        result.vehicles?.forEach((truck) => {
          // console.log('```````` ');
          // console.log('ID: ', truck.vehicleName);
          // console.log(truck.dutyStatus, truck.drivingSpeed);
          if (
            truck.dutyStatus !== 'D' &&
            truck.drivingSpeed &&
            truck.drivingSpeed > 1
          ) {
            tenantResult.push({
              tenant: result.tenant,
              driverName: truck.driverFullName,
              vehicleName: truck.vehicleName,
              driverId: truck.driverId,
              dutyStatus: truck.dutyStatus,
              drivingSpeed: truck.drivingSpeed,
              drivingSpeedUnit: truck.drivingSpeedUnit,
              location: truck.location,
            });
          }
        });
        tenantResult.length > 0 &&
          this.progressBarService.adminPortalResults.update((prev) => ({
            ...prev,
            [result.tenant.name]: tenantResult,
          }));
      }),
    );
  }

  // initializeApp$ = () => {
  //   return this.apiService.getAccessibleTenants().pipe(
  //     switchMap((tenants) => from(tenants)),
  //     mergeMap((tenant) => {
  //       return this.apiService.getDrivers(tenant);
  //     }, this.httpLimit()),
  //     tap((q) => console.log(q.items[0].));
  //   );
  // };
}
