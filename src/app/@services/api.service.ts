import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { from, Observable, tap } from 'rxjs';

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
import { DateTime } from 'luxon';
import { DateService } from './date.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http: HttpClient = inject(HttpClient);
  private dateService = inject(DateService);

  private filterRule = (range: IRange) => {
    return {
      condition: 'AND',
      filterRules: [
        {
          field: 'dateFrom',
          operator: 'equals',
          value: range.dateFrom,
        },
        {
          field: 'dateTo',
          operator: 'equals',
          value: range.dateTo,
        },
      ],
    };
  };

  constructor() {}

  // https://app.monitoringdriver.com/api/Logs/GetEvent/505900

  getEvent(id: number) {
    console.log('[API Service]: getEvent() called');
    return this.http.get<IEventDetails>(
      `https://app.monitoringdriver.com/api/Logs/GetEvent/${id}`,
      { withCredentials: true }
    );
  }

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

  getDOTInspectionList(
    tenant: ITenant,
    range: IRange
  ): Observable<IDOTInspections> {
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
          maxResultCount: 25,
        },
        {
          withCredentials: true,
          headers: {
            'X-Tenant-Id': `${tenant.id}`,
          },
        }
      )
    );
  }

  getViolations(tenant: ITenant, range: IRange): Observable<IViolations> {
    return from(
      this.http.post<IViolations>(
        'https://app.monitoringdriver.com/api/Violations/GetViolations',
        {
          filterRule: this.filterRule(range),
          searchRule: { columns: ['driverName'], text: '' },
          sorting: 'driverName asc',
          skipCount: 0,
          maxResultCount: 25,
        },
        {
          withCredentials: true,
          headers: {
            'X-Tenant-Id': `${tenant.id}`,
          },
        }
      )
    );
  }

  getDriverDailyLogEvents(driverId: number, logDate: Date, tenantId: string) {
    const body = { driverId, logDate };
    return this.http.post<IDriverDailyLogEvents>(
      'https://app.monitoringdriver.com/api/Logs/GetDriverDailyLog',
      body,
      {
        withCredentials: true,
        headers: {
          'X-Tenant-Id': `${tenantId}`,
        },
      }
    );
  }

  getMasterAppData(tenant: ITenant) {
    const url = 'https://app.monitoringdriver.com/api/Util/GetMasterAppData';

    return this.http.get<IAppMasterData>(url, {
      withCredentials: true,
      headers: {
        'X-Tenant-Id': tenant.id,
      },
    });
  }

  getLogs(tenant: ITenant, d: Date) {
    const { date, sevenDaysAgo } = this.dateService.getFormatedDates(d);

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
            value: date,
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
        'X-Tenant-Id': tenant.id,
      },
    });
  }

  getMadaFakinDriverDailyLogEvents(
    driverId: number,
    logDate: string,
    tenantId: string
  ) {
    const body = { driverId, logDate };
    return this.http.post<IDriverDailyLogEvents>(
      'https://app.monitoringdriver.com/api/Logs/GetDriverDailyLog',
      body,
      {
        withCredentials: true,
        headers: {
          'X-Tenant-Id': `${tenantId}`,
        },
      }
    );
  }

  getMadaFakinLogs(tenantId: string, dateRange: DateTime[]) {
    const url = 'https://app.monitoringdriver.com/api/Logs/GetLogs';
    const body = {
      filterRule: {
        condition: 'AND',
        filterRules: [
          {
            field: 'lastSync',
            operator: 'gte',
            value: dateRange[0].toUTC().toISO(),
          },
          {
            field: 'lastSync',
            operator: 'lte',
            value: dateRange[dateRange.length - 1].toUTC().toISO(),
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
        'X-Tenant-Id': tenantId,
      },
    });
  }
}
