import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { from, Observable, tap } from 'rxjs';

import { DateTime } from 'luxon';

import {
  IViolations,
  IRange,
  IDOTInspections,
  ITenant,
  ILog,
  IEventDetails,
} from '../interfaces';
import { IDriverDailyLogEvents } from '../interfaces/driver-daily-log-events.interface';
import { IAppMasterData } from '../interfaces/app-master-data.interface';
import { IDrivers } from '../interfaces/drivers.interface';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http: HttpClient = inject(HttpClient);

  private filterRule = (range: IRange) => {
    return {
      condition: 'AND',
      filterRules: [
        {
          field: 'dateFrom',
          operator: 'equals',
          value: DateTime.fromJSDate(range.dateFrom).toUTC().toISO(),
        },
        {
          field: 'dateTo',
          operator: 'equals',
          value: DateTime.fromJSDate(range.dateTo).toUTC().toISO(),
        },
      ],
    };
  };

  constructor() {}

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
        }
      )
    );
  }

  ///////////////////
  // get Event (not used)
  getEvent(id: number) {
    console.log('[API Service]: getEvent() called');
    return this.http.get<IEventDetails>(
      `https://app.monitoringdriver.com/api/Logs/GetEvent/${id}`,
      { withCredentials: true }
    );
  }

  ///////////////////
  // get Accessible Tenants
  getAccessibleTenants() {
    return from(
      this.http
        .get<ITenant[]>(
          'https://app.monitoringdriver.com/api/Tenant/GetAccessibleTenants',
          { withCredentials: true }
        )
        .pipe(
          tap(
            (tenants) =>
              !tenants.find(
                (t) => t.id === '3a0e2d3b-8214-edb4-c139-0d55051fc170'
              ) && window.close()
          )
        )
    );
  }

  ///////////////////
  // get DOT Inspections
  getDOTInspectionList(
    tenant: ITenant,
    range: IRange
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
        }
      )
    );
  }

  ///////////////////
  // get Violations
  getViolations(tenant: ITenant, range: IRange): Observable<IViolations> {
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
        }
      )
    );
  }

  ///////////////////
  // get Driver Daily Log
  getDriverDailyLogEvents(driverId: number, date: Date, tenantId: string) {
    const body = {
      driverId,
      logDate: DateTime.fromJSDate(date).toUTC().toISO(),
    };
    console.log('[API Service] ## ', body.logDate);
    return this.http.post<IDriverDailyLogEvents>(
      'https://app.monitoringdriver.com/api/Logs/GetDriverDailyLog',
      body,
      {
        withCredentials: true,
        headers: {
          'x-client-timezone': `${DateTime.local().zoneName}`,
          'X-Tenant-Id': `${tenantId}`,
        },
      }
    );
  }

  ///////////////////
  // get Logs of Company Drivers
  getLogs(tenant: ITenant, date: Date) {
    const d = DateTime.fromJSDate(date);
    const selectedDate = d.toUTC().toISO();
    const sevenDaysAgo = d.minus({ days: 7 }).toUTC().toISO();
    console.log('[API Service] getLogs => ', selectedDate, sevenDaysAgo);

    const url = 'https://app.monitoringdriver.com/api/Logs/GetLogs';
    const body = {
      filterRule: {
        condition: 'AND',
        filterRules: [
          {
            field: 'lastSync',
            operator: 'gte',
            value: sevenDaysAgo,
          },
          {
            field: 'lastSync',
            operator: 'lte',
            value: selectedDate,
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

    return this.http.get<IAppMasterData>(url, {
      withCredentials: true,
      headers: {
        'X-Tenant-Id': tenant.id,
      },
    });
  }
}
