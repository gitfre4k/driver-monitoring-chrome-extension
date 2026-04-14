import { inject, Injectable } from '@angular/core';
import { from, map, mergeMap, switchMap, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ApiPrologsAdminService } from './api-prologs-admin.service';
import { ConstantsService } from './constants.service';
import { DateService } from './date.service';
import { ProgressBarService } from './progress-bar.service';
import { IScanAdminPortalResultDriver, ITenant } from '../interfaces';
import { DateTime } from 'luxon';

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

  getMinutesAgoFromNow(lastTimestamp: string) {
    const startTime = DateTime.fromISO(lastTimestamp);
    const now = DateTime.now();

    const diff = now.diff(startTime, 'minutes').minutes;

    return Math.floor(diff);
  }

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
        const tenantDisconnectedResult: Partial<IScanAdminPortalResultDriver>[] =
          [];
        const tenantUnpluggedResult: Partial<IScanAdminPortalResultDriver>[] =
          [];

        result.vehicles.forEach((truck) => {
          // disconnected
          if (
            truck.dutyStatus !== 'D' &&
            truck.drivingSpeed &&
            truck.drivingSpeed > 1 &&
            this.getMinutesAgoFromNow(truck.lastTimestamp) <
              this.progressBarService.adminLastActivity()
          ) {
            console.log(
              truck.vehicleName,
              truck.lastTimestamp,
              this.getMinutesAgoFromNow(truck.lastTimestamp),
            );

            tenantDisconnectedResult.push({
              tenant: result.tenant,
              driverName: truck.driverFullName,
              vehicleName: truck.vehicleName,
              driverId: truck.driverId,
              dutyStatus: truck.dutyStatus,
              drivingSpeed: truck.drivingSpeed,
              drivingSpeedUnit: truck.drivingSpeedUnit,
              location: truck.location,
              lastActivity: this.getMinutesAgoFromNow(truck.lastTimestamp),
            });
          }
          // unplugged
          if (
            !truck.isPlugged &&
            this.getMinutesAgoFromNow(truck.isPluggedUpdateTime) <
              this.progressBarService.adminELDUnplugged() * 60
          ) {
            tenantUnpluggedResult.push({
              tenant: result.tenant,
              driverName: truck.driverFullName,
              vehicleName: truck.vehicleName,
              driverId: truck.driverId,
              dutyStatus: truck.dutyStatus,
              drivingSpeed: truck.drivingSpeed ?? 0,
              drivingSpeedUnit: truck.drivingSpeedUnit,
              location: truck.location,
              lastActivity: this.getMinutesAgoFromNow(
                truck.isPluggedUpdateTime,
              ),
            });
          }
        });
        tenantDisconnectedResult.length > 0 &&
          this.progressBarService.adminPortalDisconnected.update((prev) => ({
            ...prev,
            [result.tenant.name]: tenantDisconnectedResult,
          }));
        tenantUnpluggedResult.length > 0 &&
          this.progressBarService.adminPortalUnplugged.update((prev) => ({
            ...prev,
            [result.tenant.name]: tenantUnpluggedResult,
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
