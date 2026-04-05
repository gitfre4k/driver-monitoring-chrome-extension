import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { UrlService } from './url.service';
import { switchMap, catchError, of, Observable, tap, map } from 'rxjs';
import { IDriverVehicleStatus } from '../interfaces/dashboard-locations-data.interface';
import { IVehicleMaintenance } from '../interfaces/vehicle-maintenance.interface';
import { IVehicleLocationHistory } from '../interfaces/vehicle-location-history.interface';

@Injectable({
  providedIn: 'root',
})
export class ApiPrologsAdminService {
  private http: HttpClient = inject(HttpClient);
  private urlService = inject(UrlService);

  private getBaseUrl(): string {
    return ['prologs', 'Prologs'].includes(this.urlService.provider)
      ? `https://api.prologs.us/api/`
      : `https://api.synergyeld.com/api/`;
  }

  private getHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      'x-client-timezone': `${DateTime.local().zoneName}`,
    };
  }

  // acquireTenantAdminToken(tenantId: string) {
  //   const url = this.getBaseUrl() + `app/tenant/acquiretenantadminaccesstoken`;

  //   return this.urlService.onGetAdminProLogsToken().pipe(
  //     tap((token) => console.log('urlService -- tokentokentoken', token)),
  //     switchMap((token) => {
  //       const body = {
  //         id: tenantId,
  //         requestedScopes: [
  //           'openid',
  //           'profile',
  //           'email',
  //           'offline_access',
  //           'EldApi',
  //           'role',
  //         ],
  //       };
  //       return this.http.post<{ accessToken: string }>(url, body, {
  //         withCredentials: true,
  //         headers: this.getHeaders(token),
  //       });
  //     }),
  //     catchError((err) => {
  //       console.error('Failed to acquire admin token', err);
  //       // Returning of({ accessToken: '' }) allows dependent switchMaps to trigger
  //       // but they will likely fail and be caught by their own catchError.
  //       return this.urlService
  //         .onGetAdminProLogsToken()
  //         .pipe(map((t) => ({ accessToken: t })));
  //     }),
  //   );
  // }

  getDashboardLocationsData(
    tenantId: string,
  ): Observable<IDriverVehicleStatus[] | null> {
    const url = this.getBaseUrl() + `app/dashboard/dashboardlocationsdata`;

    return this.urlService
      .onGetAdminProLogsToken()
      .pipe(map((t) => ({ accessToken: t })))
      .pipe(
        switchMap(({ accessToken }) => {
          return this.http.get<IDriverVehicleStatus[]>(url, {
            withCredentials: true,
            headers: this.getHeaders(accessToken),
          });
        }),
        catchError((err) => {
          console.error('Error fetching dashboard locations:', err);
          return of(null);
        }),
      );
  }

  getVehicleMaintenance(
    tenantId: string,
    vehicleId: number,
  ): Observable<IVehicleMaintenance | null> {
    const url =
      this.getBaseUrl() + `app/maintenancedashboard/${vehicleId}/vehicle`;

    return this.urlService
      .onGetAdminProLogsToken()
      .pipe(map((t) => ({ accessToken: t })))
      .pipe(
        switchMap(({ accessToken }) => {
          if (!accessToken) return of(null);
          return this.http.get<IVehicleMaintenance>(url, {
            withCredentials: true,
            headers: this.getHeaders(accessToken),
          });
        }),
        catchError((err) => {
          console.error(
            `Error fetching maintenance for vehicle ${vehicleId}:`,
            err,
          );
          return of(null);
        }),
      );
  }

  getVehicleLocationHistory(
    tenantId: string,
    vehicleId: number,
  ): Observable<IVehicleLocationHistory | null> {
    const dateStr = DateTime.now().toUTC().toISO();
    const url =
      this.getBaseUrl() +
      `app/location/vehicle-location-history?vehicleId=${vehicleId}&date=${dateStr}`;

    return this.urlService
      .onGetAdminProLogsToken()
      .pipe(map((t) => ({ accessToken: t })))
      .pipe(
        switchMap(({ accessToken }) => {
          if (!accessToken) return of(null);
          return this.http.get<IVehicleLocationHistory>(url, {
            withCredentials: true,
            headers: this.getHeaders(accessToken),
          });
        }),
        catchError((err) => {
          console.error(
            `Error fetching location history for vehicle ${vehicleId}:`,
            err,
          );
          return of(null);
        }),
      );
  }
}

// const t = [

// ];
