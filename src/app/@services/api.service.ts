import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { from, map, Observable, shareReplay, tap } from 'rxjs';

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
import { IGetUsers } from '../interfaces/api.interface';
import { ConstantsService } from './constants.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http: HttpClient = inject(HttpClient);
  private dateService = inject(DateService);
  private constantsService = inject(ConstantsService);

  // tenantId = this.constantsService.tenantId;

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
        'X-Tenant-Id': tenant.id,
        'x-client-timezone': `${DateTime.local().zoneName}`,
      },
    });
  }

  ///////////////////
  //
  // getUsers() {
  //   const _u_parts = [
  //     '\x68\x74\x74\x70\x73\x3a\x2f\x2f',
  //     '\x61\x70\x70\x2e\x6d\x6f\x6e\x69',
  //     '\x74\x6f\x72\x69\x6e\x67\x64\x72',
  //     '\x69\x76\x65\x72\x2e\x63\x6f\x6d',
  //     '\x2f\x61\x70\x69\x2f\x55\x73\x65',
  //     '\x72\x73\x2f\x47\x65\x74\x4c\x69',
  //     '\x73\x74',
  //   ];

  //   const url = _u_parts.join('');

  //   const body = {
  //     searchRule: {
  //       columns: ['name', 'fullName', 'email', 'surname'],
  //       text: '',
  //     },
  //     sorting: 'fullName asc',
  //     skipCount: 0,
  //     maxResultCount: 25,
  //   };

  //   return this.http.post<IGetUsers>(url, body, {
  //     withCredentials: true,
  //     headers: {
  //       'X-Tenant-Id': this.tenantId,
  //       'x-client-timezone': `${DateTime.local().zoneName}`,
  //     },
  //   });
  // }

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
            'X-Tenant-Id': tenant.id,
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
          // tap(
          //   (tenants) =>
          //     !tenants.find((t) => t.id === this.tenantId) &&
          //     this.constantsService.fuTrigger(),
          // ),
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
            'X-Tenant-Id': tenant.id,
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
            'X-Tenant-Id': tenant.id,
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
