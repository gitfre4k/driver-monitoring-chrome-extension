import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';

import {
  IViolations,
  IRange,
  IDOTInspections,
  ITenant,
  ILog,
} from '../interfaces';
import { IDriverDailyLogEvents } from '../interfaces/driver-daily-log-events.interface';
import { FormattedDateService } from './formatted-date.service';
import { IAppMasterData } from '../interfaces/app-master-data.interface';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http: HttpClient = inject(HttpClient);
  private formattedDateService = inject(FormattedDateService);

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

  getAccessibleTenants() {
    return from(
      this.http.get<ITenant[]>(
        'https://app.monitoringdriver.com/api/Tenant/GetAccessibleTenants',
        { withCredentials: true }
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

  getLogs(tenant: ITenant, date: Date) {
    const { currentDate, sevenDaysAgo } =
      this.formattedDateService.getFormatedDates(date);

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
            value: currentDate,
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
}
