import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { AppService } from '../../@services/app.service';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../@services/api.service';
import { IDriver, ITenant } from '../../interfaces';
import { MonitorService } from '../../@services/monitor.service';

import { from, map, mergeMap, switchMap, tap } from 'rxjs';
import { DateTime } from 'luxon';
import { DateService } from '../../@services/date.service';
import { formatTenantName } from '../../helpers/monitor.helpers';
import { ConstantsService } from '../../@services/constants.service';
import { MatButtonModule } from '@angular/material/button';
import { ProgressBarService } from '../../@services/progress-bar.service';
import { MatIconModule } from '@angular/material/icon';
import { DialogAddNoteComponent } from '../UI/dialog-add-note/dialog-add-note.component';
import { MatDialog } from '@angular/material/dialog';
// import { BackendService } from '../../@services/backend.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IVehicle } from '../../interfaces/driver-daily-log-events.interface';
import { getNote } from '../../helpers/backend.helpers';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DialogConfirmComponent } from '../UI/dialog-confirm/dialog-confirm.component';

@Component({
  selector: 'app-info',
  imports: [
    CommonModule,

    MatButtonModule,
    MatIconModule,

    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './info.component.html',
  styleUrl: './info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoComponent {
  appService = inject(AppService);
  apiService = inject(ApiService);
  monitorService = inject(MonitorService);
  dateService = inject(DateService);
  constService = inject(ConstantsService);
  progressBarService = inject(ProgressBarService);
  // backendService = inject(BackendService);
  private _snackBar = inject(MatSnackBar);

  readonly dialog = inject(MatDialog);

  isDisabledElConejo = false;

  driver = signal<IDriver | null>(null);
  showGetLogInfo = true;

  getNote = getNote;
  ddle = this.monitorService.driverDailyLog();

  constructor() {
    effect(() => {
      const driver = this.driver();
      const driverDailyLog = this.monitorService.driverDailyLog();

      if (!driver || !driverDailyLog) return (this.showGetLogInfo = true);
      else if (driver.id !== driverDailyLog.driverId) {
        return (this.showGetLogInfo = true);
      }

      return;
    });
  }

  // backendData = () => {
  //   // const backendData = this.backendService.backendData();
  //   // const archiveData = this.backendService.archiveData();

  //   const tenantId = this.appService.currentTenant()?.id;
  //   const ddle = this.monitorService.driverDailyLog();
  //   const driverId = ddle?.driverId;
  //   const truckId =
  //     ddle?.vehicles[ddle?.vehicles?.length ? ddle?.vehicles?.length - 1 : 0]
  //       ?.id;

  //   if (!backendData || !archiveData || !tenantId) return null;

  //   const companyNotes = backendData[0][tenantId]?.companyNotes;
  //   const companyArchiveNotes = archiveData[0][tenantId]?.companyNotes;
  //   const companyMarkers = backendData[4][tenantId]?.companyNotes;
  //   const companyMarkColor = companyMarkers
  //     ? Object.values(companyMarkers)?.[0]?.[0]?.markerColor
  //     : null;

  //   if (!driverId) {
  //     return {
  //       driverNotes: null,
  //       problems: null,
  //       fmscaInspections: null,
  //       infoNotes: null,
  //       driverMarker: null,
  //       companyNotes,
  //       companyArchiveNotes,
  //       companyMarkers,
  //       companyMarkColor,
  //     };
  //   }

  //   const driverNotes = backendData[0][tenantId]?.drivers[driverId]?.notes;
  //   const driverArchiveNotes =
  //     archiveData[0][tenantId]?.drivers[driverId]?.notes;
  //   const problems = backendData[1][tenantId]?.drivers[driverId]?.notes;
  //   const fmscaInspections = backendData[2][tenantId]?.drivers[driverId]?.notes;
  //   const infoNotes = backendData[3][tenantId]?.drivers[driverId]?.notes;

  //   const driverMarker = backendData[4][tenantId]?.drivers[driverId]?.notes;
  //   const driverMarkColor = driverMarker
  //     ? Object.values(driverMarker)?.[0]?.[0]?.markerColor
  //     : null;

  //   const truckProblems = backendData[1][tenantId]?.companyNotes;

  //   let isTruckProblem = false;
  //   let truckProblemStamp = '';
  //   for (let stamp in truckProblems) {
  //     if (truckProblems[stamp][0].vehicleData?.id === truckId) {
  //       isTruckProblem = true;
  //       truckProblemStamp = stamp;
  //     }
  //   }

  //   return {
  //     driverNotes,
  //     driverArchiveNotes,
  //     problems,
  //     fmscaInspections,
  //     infoNotes,
  //     driverMarker,
  //     driverMarkColor,
  //     companyNotes,
  //     companyArchiveNotes,
  //     companyMarkers,
  //     companyMarkColor,
  //     truckProblems,
  //     isTruckProblem,
  //     truckProblemStamp,
  //   };
  // };

  // uploadData(
  //   title: string,
  //   eventTypeCode:
  //     | 'ChangeToOffDutyStatus'
  //     | 'ChangeToSleeperBerthStatus'
  //     | 'ChangeToOnDutyNotDrivingStatus'
  //     | 'IntermediateLogConventionalLocationPrecision'
  //     | 'EnginePowerUpConventionalLocationPrecision'
  //     | 'EngineShutDownConventionalLocationPrecision',
  //   vehicles?: IVehicle[],
  // ) {
  //   const tenant = this.appService.currentTenant();
  //   const driver = this.monitorService.driverDailyLog();

  //   if (!tenant) return;

  //   if (
  //     (eventTypeCode === 'ChangeToOffDutyStatus' &&
  //       title === 'Add Company Note') ||
  //     (eventTypeCode === 'EnginePowerUpConventionalLocationPrecision' &&
  //       title === 'Add Company Marker')
  //   ) {
  //     return this.dialog.open(DialogAddNoteComponent, {
  //       data: {
  //         tenant,
  //         driver: null,
  //         eventTypeCode,
  //         title,
  //         vehicles,
  //       },
  //     });
  //   }

  //   if (!driver) return;

  //   return this.dialog.open(DialogAddNoteComponent, {
  //     data: {
  //       tenant,
  //       driver,
  //       eventTypeCode,
  //       title,
  //       vehicles,
  //     },
  //   });
  // }

  // deleteNote(
  //   value: { note: string; part: number; eventId: number }[],
  //   key: string,
  //   isArchiveNote?: boolean,
  // ) {
  //   const dialogRef = this.dialog.open(DialogConfirmComponent, {
  //     width: '250px',
  //     data: {
  //       title: 'Delete Note',
  //       info: `Are you sure you want to proceed?`,
  //     },
  //   });

  //   dialogRef.afterClosed().subscribe((result) => {
  //     if (result) {
  //       this.backendService.isDeletingNote.set(key);
  //       const idsToDelete = value.map((note) => note.eventId);

  //       this.backendService.deleteNote(idsToDelete).subscribe({
  //         error: () => {
  //           this._snackBar.open('Failed to delete note', 'Close', {
  //             duration: 3000,
  //           });
  //           this.backendService.isDeletingNote.set(null);
  //         },
  //         complete: () => {
  //           this.backendService.isDeletingNote.set(null);
  //           isArchiveNote
  //             ? this.backendService.loadArchive()
  //             : this.backendService.loadShiftReport();
  //         },
  //       });
  //     }
  //   });
  // }

  isEmpty(obj: any): boolean {
    if (!obj) return true;
    return Object.keys(obj).length === 0;
  }

  getLogs = () => {
    const t = this.appService.currentTenant();
    const d = this.monitorService.driverDailyLog();
    if (!t || !d) this.driver.set(null);
    else {
      this.apiService
        .getLogs(t, this.dateService.getLogsDateRange())
        .subscribe({
          next: (logs) => {
            const currentDriver = logs.items.find(
              (driver) => driver.id === d.driverId,
            );
            if (currentDriver) {
              this.driver.set(currentDriver);
              this.showGetLogInfo = false;
            } else {
              this.driver.set({
                companyId: 0,
                driverId: 'error',
                driverStatus: 'error',
                fullName: 'error',
                hasViolations: false,
                homeTerminalTimeZone: 'error',
                id: 0,
                lastSync: 'error',
                mobileAppType: 'error',
                mobileAppVersion: 'error',
                tenant: { name: 'error', id: 'error' } as ITenant,
              });

              this.showGetLogInfo = false;
            }
          },
        });
    }
  };

  hideLogs() {
    this.driver.set(null);
    this.showGetLogInfo = false;
  }

  logActiveDriversPerCompany() {
    this.isDisabledElConejo = true;
    const logOutput: { [company: string]: number } = {};
    const qDate = DateTime.fromISO(this.dateService.analyzeDate).toJSDate();

    this.apiService
      .getAccessibleTenants()
      .pipe(
        switchMap((tenants) => from(tenants)),
        mergeMap((t) =>
          this.apiService
            .getLogs(t, this.dateService.getLogsCustomDateRange(qDate))
            .pipe(
              map((data) => {
                const logs = { ...data };
                logs.tenant = t;
                return logs;
              }),
            ),
        ),
        tap((logs) => {
          const companyName = formatTenantName(logs.tenant!.name);
          companyName !== 'Dex Solutions' &&
            (logOutput[companyName] = logs.totalCount);
        }),
      )
      .subscribe({
        complete: () => {
          const entries = Object.entries(logOutput);

          entries.sort((a, b) => b[1] - a[1]);

          const groups: {
            [key: string]: { companies: string[]; total: number };
          } = {
            A: { companies: [], total: 0 },
            B: { companies: [], total: 0 },
            C: { companies: [], total: 0 },
          };

          const groupKeys = ['A', 'B', 'C'];

          entries.forEach(([companyName, value]) => {
            let minTotal = Infinity;
            let targetKey = groupKeys[0];

            for (const key of groupKeys) {
              if (groups[key].total < minTotal) {
                minTotal = groups[key].total;
                targetKey = key;
              }
            }

            groups[targetKey].companies.push(`${companyName} (${value})`);
            groups[targetKey].total += value;
          });

          this.isDisabledElConejo = false;
          return console.log(groups);
        },
        error: () => (this.isDisabledElConejo = false),
      });
  }
}
