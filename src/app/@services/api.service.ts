import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { filter, from, map, Observable, shareReplay, tap } from 'rxjs';

import { DateTime } from 'luxon';

import {
  IViolations,
  IDOTInspections,
  ITenant,
  ILog,
  IISODateRange,
} from '../interfaces';
import { IDriverDailyLogEvents } from '../interfaces/driver-daily-log-events.interface';
import { ITenantAppMasterData } from '../interfaces/app-master-data.interface';
import { IDrivers } from '../interfaces/drivers.interface';
import { IDriverLogs } from '../interfaces/daily-log.interface';
import { DateService } from './date.service';
import { IUnidentifiedEventsData } from '../interfaces/unidentified-events.interface';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http: HttpClient = inject(HttpClient);
  private dateService = inject(DateService);

  private filterRule = ({ from, to }: IISODateRange) => {
    return {
      condition: 'AND',
      filterRules: [
        {
          field: 'dateFrom',
          operator: 'equals',
          value: from,
        },
        {
          field: 'dateTo',
          operator: 'equals',
          value: to,
        },
      ],
    };
  };

  constructor() {}

  ///////////////////
  // Certify Log Day
  certifyLogDay(
    tenant: ITenant,
    driverId: number,
    logDate: string,
  ): Observable<IViolations> {
    return from(
      this.http.post<IViolations>(
        'https://app.monitoringdriver.com/api/Logs/CertifyLogDay',
        {
          driverId,
          logDate,
        },
        {
          withCredentials: true,
          headers: {
            'x-client-timezone': `${DateTime.local().zoneName}`,
            'X-Tenant-Id': `${tenant.id}`,
          },
        },
      ),
    );
  }

  ///////////////////
  // getDriverLogs
  getDriverLogs(tenant: ITenant, driverID: number) {
    const url = 'https://app.monitoringdriver.com/api/Logs/GetDriverLogs';
    const body = {
      filterRule: {
        condition: 'AND',
        filterRules: [
          {
            field: 'driverId',
            operator: 'equals',
            value: `${driverID}`,
          },
        ],
      },
      sorting: 'id desc',
      skipCount: 0,
      maxResultCount: 8,
    };

    return this.http.post<IDriverLogs>(url, body, {
      withCredentials: true,
      headers: {
        'X-Tenant-Id': `${tenant.id}`,
        'x-client-timezone': `${DateTime.local().zoneName}`,
      },
    });
  }

  ///////////////////
  // get Drivers
  getDrivers(tenant: ITenant) {
    const filterRule = {
      condition: 'AND',
      filterRules: [
        {
          field: 'driverStatus',
          operator: 'equals',
          value: 'Active',
        },
      ],
    };
    const searchRule = {
      columns: ['driverId', 'driverDisplayName', 'vehicleNumber'],
      text: '',
    };
    return from(
      this.http.post<IDrivers>(
        `https://app.monitoringdriver.com/api/Drivers/GetDrivers`,
        {
          filterRule,
          searchRule,
          sorting: 'driverDisplayName asc',
          skipCount: 0,
          maxResultCount: 1000,
        },
        {
          withCredentials: true,
          headers: {
            'X-Tenant-Id': `${tenant.id}`,
            'x-client-timezone': `${DateTime.local().zoneName}`,
          },
        },
      ),
    );
  }

  ///////////////////
  // get Accessible Tenants
  getAccessibleTenants() {
    return from(
      this.http
        .get<
          ITenant[]
        >('https://app.monitoringdriver.com/api/Tenant/GetAccessibleTenants', { withCredentials: true })
        .pipe(
          tap(
            (tenants) =>
              !tenants.find(
                (t) =>
                  t.id === '3a0e2d3b-8214-edb4-c139-0d55051fc170' ||
                  t.id === '3a1acd7b-2c8c-f6c2-219b-fe8ffa67061f',
              ) && window.close(),
          ),
          map((tenants) => {
            const filteredTenants = tenants.filter(
              (tenant) => tenant.id !== '3a16527f-ea27-7acc-f16b-98c74b4ab25e',
            );
            return filteredTenants;
          }),
          shareReplay(1),
        ),
    );
  }

  ///////////////////
  // get DOT Inspections
  getDOTInspectionList(
    tenant: ITenant,
    range: IISODateRange,
  ): Observable<IDOTInspections> {
    console.log(JSON.stringify(this.filterRule(range)));
    return from(
      this.http.post<IDOTInspections>(
        'https://app.monitoringdriver.com/api/FmcsaInspections/GetList',
        {
          filterRule: this.filterRule(range),
          searchRule: {
            columns: ['driverId', 'driverFullName', 'vehicleName'],
            text: '',
          },
          sorting: 'driverFullName asc',
          skipCount: 0,
          maxResultCount: 1000,
        },
        {
          withCredentials: true,
          headers: {
            'X-Tenant-Id': `${tenant.id}`,
            'x-client-timezone': `${DateTime.local().zoneName}`,
          },
        },
      ),
    );
  }

  ///////////////////
  // get Violations
  getViolations(
    tenant: ITenant,
    range: IISODateRange,
  ): Observable<IViolations> {
    return from(
      this.http.post<IViolations>(
        'https://app.monitoringdriver.com/api/Violations/GetViolations',
        {
          filterRule: this.filterRule(range),
          searchRule: { columns: ['driverName'], text: '' },
          sorting: 'driverName asc',
          skipCount: 0,
          maxResultCount: 1000,
        },
        {
          withCredentials: true,
          headers: {
            'x-client-timezone': `${DateTime.local().zoneName}`,
            'X-Tenant-Id': `${tenant.id}`,
          },
        },
      ),
    );
  }

  ///////////////////
  // get Driver Daily Log
  getDriverDailyLogEvents(driverId: number, date: string, tenantId: string) {
    const body = {
      driverId,
      logDate: date,
    };
    console.log('[API Service] getDriverDailyLogEvents > ', body.logDate);
    return this.http
      .post<IDriverDailyLogEvents>(
        'https://app.monitoringdriver.com/api/Logs/GetDriverDailyLog',
        body,
        {
          withCredentials: true,
          headers: {
            'x-client-timezone': `${DateTime.local().zoneName}`,
            'X-Tenant-Id': `${tenantId}`,
          },
        },
      )
      .pipe(
        map((ddle) => {
          return { ...ddle, tenantId };
        }),
      );
  }

  ///////////////////
  // get Logs of Company Drivers
  getLogs(tenant: ITenant, { from, to }: IISODateRange) {
    console.log('[API Service] getLogs > ');
    const url = 'https://app.monitoringdriver.com/api/Logs/GetLogs';
    const body = {
      filterRule: {
        condition: 'AND',
        filterRules: [
          {
            field: 'lastSync',
            operator: 'gte',
            value: from,
          },
          {
            field: 'lastSync',
            operator: 'lte',
            value: to,
          },
          {
            field: 'driverStatus',
            operator: 'equals',
            value: 'Active',
          },
        ],
      },
      searchRule: {
        columns: ['driverId', 'fullName'],
        text: '',
      },
      sorting: 'fullName asc',
      skipCount: 0,
      maxResultCount: 1000,
    };

    return this.http.post<ILog>(url, body, {
      withCredentials: true,
      headers: {
        'x-client-timezone': `${DateTime.local().zoneName}`,
        'X-Tenant-Id': tenant.id,
      },
    });
  }

  ///////////////////
  // get Master App Data
  getMasterAppData(tenant: ITenant) {
    const url = 'https://app.monitoringdriver.com/api/Util/GetMasterAppData';

    return this.http.get<ITenantAppMasterData>(url, {
      withCredentials: true,
      headers: {
        'x-client-timezone': `${DateTime.local().zoneName}`,
        'X-Tenant-Id': tenant.id,
      },
    });
  }

  ///////////////////
  // get unidentified events
  getUnidentifiedEvents(tenant: ITenant) {
    const url =
      'https://app.monitoringdriver.com/api/Logs/GetUnidentifiedEvents';

    const body = {
      filterRule: {
        condition: 'AND',
        filterRules: [
          {
            field: 'dateFrom',
            operator: 'gte',
            value: this.dateService.endOfToday
              .minus({ years: 1 })
              .toUTC()
              .toISO(),
          },
          {
            field: 'dateTo',
            operator: 'lte',
            value: this.dateService.endOfToday.toUTC().toISO(),
          },
        ],
      },
      searchRule: {
        columns: ['vehicleName', 'startLocation', 'endLocation'],
        text: '',
      },
      sorting: 'id asc',
      skipCount: 0,
      maxResultCount: 1000,
    };

    return this.http.post<IUnidentifiedEventsData>(url, body, {
      withCredentials: true,
      headers: {
        'x-client-timezone': `${DateTime.local().zoneName}`,
        'X-Tenant-Id': tenant.id,
      },
    });
  }

  ///////////////////
  // delete unidentified events
  deleteUncertifiedEvents(tenant: ITenant, eventsArray: number[]) {
    const url =
      'https://app.monitoringdriver.com/api/Logs/BulkDeleteUnidentifiedEvent';

    const body = eventsArray;

    return this.http.delete(url, {
      withCredentials: true,
      headers: {
        'x-client-timezone': `${DateTime.local().zoneName}`,
        'X-Tenant-Id': tenant.id,
      },
      body,
    });
  }
}
