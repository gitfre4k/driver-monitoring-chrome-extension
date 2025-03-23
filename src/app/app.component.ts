import { Component, inject } from '@angular/core';
import { ApiService } from './services/api.service';
import { CommonModule } from '@angular/common';

import { UrlParamsService } from './chrome/url-params.service';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';

import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScanComponent } from './components/scan/scan.component';
import { catchError, concatMap, from, mergeMap, of, tap } from 'rxjs';
import { ScanService } from './services/scan.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [
    CommonModule,
    MatButtonModule,
    MatDividerModule,
    MatCardModule,
    MatListModule,
    MatTabsModule,
    MatIconModule,
    MatTooltipModule,
    ScanComponent,
  ],
})
export class AppComponent {
  title = 'driver-monitoring-chrome-extension';

  private apiService: ApiService = inject(ApiService);
  private urlParamsService: UrlParamsService = inject(UrlParamsService);
  private scanService: ScanService = inject(ScanService);

  scanning = this.scanService.scanning;

  constructor() {}

  popUp() {
    const windowFeatures =
      'resizable=no,target="dmcev001win",left=100,top=100,width=536,height=640';
    window.open('index.html', '', windowFeatures);
    window.close();
  }

  getDOTs() {
    this.apiService
      .getAccessibleTenants()
      .pipe(
        mergeMap((tenants) => from(tenants)),
        concatMap((t) =>
          this.apiService.getDOTInspectionList(t).pipe(
            tap(() => console.log(t.name)),
            tap({
              error: (error) => console.log(error),
            }),
            catchError(() => of())
          )
        )
      )
      .subscribe((q) => console.log(q));
  }

  getEvents = () => {
    let driverId: number;
    let logDate: string;
    let tenantId: string;
    this.urlParamsService.getDataFromChrome((result) => {
      if (result) {
        driverId = result.driverID;

        logDate = result.logDate;

        tenantId = result.tenantId;

        this.apiService
          .getDriverDailyLogEvents(driverId, logDate, tenantId)
          .subscribe({
            next: (data) => {
              console.log('Daily logs: ', data);
              console.log('Company Name:', data.companyName);
              console.log('Driver Name', data.driverFullName);
              console.log('Events: ', data.events);

              for (let i in data.events) {
                console.log('Duty status: ', data.events[i].dutyStatus);
                console.log('Odometer: ', data.events[i].odometer);
              }
            },
            error: (error) => {
              console.error(error);
            },
          });
      } else {
        console.error('No result found');
      }
    });
  };
}

// mock
