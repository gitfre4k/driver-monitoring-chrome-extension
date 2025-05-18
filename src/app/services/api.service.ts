import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, from, Observable } from 'rxjs';

import { IViolations, ICompany, IRange, IDOTInspections } from '../interfaces';
import { IDriverDailyLogEvents } from '../interfaces/driver-daily-log-events.interface';

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

  constructor() { }

  getAccessibleTenants() {
    return from(
      this.http.get<ICompany[]>(
        'https://app.monitoringdriver.com/api/Tenant/GetAccessibleTenants',
        { withCredentials: true }
      )
    );
  }

  getDOTInspectionList(
    tenant: ICompany,
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

  getViolations(tenant: ICompany, range: IRange): Observable<IViolations> {
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

  getLogs() {
    const url = 'https://app.monitoringdriver.com/api/Logs/GetLogs';
    const body = {
      "filterRule": {
        "condition": "AND",
        "filterRules": [
          {
            "field": "lastSync",
            "operator": "gte",
            "value": "2025-05-12T04:59:59.999Z"
          },
          {
            "field": "lastSync",
            "operator": "lte",
            "value": "2025-05-19T04:59:59.999Z"
          },
          {
            "field": "driverStatus",
            "operator": "equals",
            "value": "Active"
          }
        ]
      },
      "searchRule": {
        "columns": [
          "driverId",
          "fullName"
        ],
        "text": ""
      },
      "sorting": "fullName asc",
      "skipCount": 0,
      "maxResultCount": 25
    }

    return this.http.post<any[]>(
      url,
      body,
      {
        withCredentials: true,
        headers: {
          'X-Tenant-Id': `3a0f81b9-d2b0-0d9f-5441-ff525cfc594f`,
        },
      }
    );

  }
}