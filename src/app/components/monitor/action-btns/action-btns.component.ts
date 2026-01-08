import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { MonitorService } from '../../../@services/monitor.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CdkMenuModule } from '@angular/cdk/menu';
import { MonitorMenuComponent } from '../monitor-menu/monitor-menu.component';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  IDriverFmcsaInspection,
  IVehicle,
} from '../../../interfaces/driver-daily-log-events.interface';
import { ApiPrologsAdminService } from '../../../@services/api-prologs-admin.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogVehicleMaintanenceComponent } from '../../UI/dialog-vehicle-maintanence/dialog-vehicle-maintanence.component';
import { switchMap } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContextMenuService } from '../../../@services/context-menu.service';

import { UrlService } from '../../../@services/url.service';
import { SmartFixService } from '../../../@services/smart-fix.service';
import { BackendService } from '../../../@services/backend.service';
import { DatePipe } from '@angular/common';
import { ConstantsService } from '../../../@services/constants.service';

@Component({
  selector: 'app-action-btns',
  imports: [
    MatIconModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    CdkMenuModule,
    MonitorMenuComponent,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    DatePipe,
  ],
  templateUrl: './action-btns.component.html',
  styleUrl: './action-btns.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionBtnsComponent {
  vehicles = input<IVehicle[]>();
  tenantId = input<string>();
  driverId = input<string>();

  monitorService = inject(MonitorService);
  smartFixService = inject(SmartFixService);
  apiPrologsAdminService = inject(ApiPrologsAdminService);
  contextMenuService = inject(ContextMenuService);
  urlService = inject(UrlService);
  backendService = inject(BackendService);
  constantsService = inject(ConstantsService);
  _dialog = inject(MatDialog);
  _snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  isSmartFix = signal(false);

  deselectAllEvents() {
    this.monitorService.selectedEvents.set([]);
  }

  fmcsaDate = computed(() => {
    const ddle = this.monitorService.driverDailyLog();
    const tenantId = this.tenantId();
    const backendData = this.backendService.backendData();
    if (!ddle || !tenantId || !backendData) return null;

    const driverId = ddle.driverId;

    const dots = backendData[2][tenantId]?.drivers[driverId]?.notes;
    if (!dots) return null;

    const fmcsaInspections: IDriverFmcsaInspection[] = [];
    for (let stamp in dots) {
      let dotJSON = '';
      const inspection = dots[stamp].sort((a, b) => a.part - b.part);
      inspection.forEach((part) => (dotJSON += part.note));

      fmcsaInspections.push(JSON.parse(dotJSON));
    }

    let latestDate = null;
    for (const item of fmcsaInspections) {
      const currentDate = item.reportTimeTo;
      if (currentDate) {
        if (latestDate === null || currentDate > latestDate) {
          latestDate = currentDate;
        }
      }
    }

    return latestDate ? latestDate : null;
  });

  navigateToDotInspection() {
    const ddle = this.monitorService.driverDailyLog();
    const date = this.fmcsaDate();
    if (!ddle || !date) return;

    const driverId = ddle.driverId;

    return this.urlService.navigateChromeActiveTab(
      `https://app.monitoringdriver.com/logs/${driverId}/${date}/`,
    );
  }

  smartFix() {
    const ddle = this.monitorService.driverDailyLog();
    if (!ddle) return;

    const tenantId = this.tenantId()!;
    const driverId = ddle.driverId;
    this.isSmartFix.set(true);

    this.smartFixService
      .smartFix(tenantId, driverId, ddle.date)
      .pipe()
      .subscribe({
        next: (res) => {
          this.isSmartFix.set(false);
          this.monitorService.refreshDailyLogs();
          this.urlService.refreshWebApp();
          if (res[0] && res[0].errorMessage) {
            this._snackBar.open(
              `[Smart Fix] Error: ${res[0].errorMessage}`,
              'OK',
              { duration: 7000 },
            );
          } else
            this._snackBar.open('Smart fix performed successfully', 'OK', {
              duration: 3000,
            });
        },

        error: (err) => {
          this.isSmartFix.set(false);
          this._snackBar.open(err.error.message, 'Close', { duration: 7000 });
        },
      });
  }

  getVehicleMaintenance() {
    this.isLoading.set(true);
    const tenantId = this.tenantId();
    const vehicles = this.vehicles();
    if (!tenantId || !vehicles || !vehicles.length)
      return this.isLoading.set(false);

    return this.apiPrologsAdminService
      .getVehicleMaintenance(tenantId, vehicles.at(-1)!.id)
      .pipe(
        switchMap((data) => {
          this.isLoading.set(false);
          return this._dialog
            .open(DialogVehicleMaintanenceComponent, { data })
            .afterClosed();
        }),
      )
      .subscribe({
        error: (err) => {
          this._snackBar.open(
            `[ERROR] ${err.message ?? err.error.message}`,
            'Close',
            { duration: 7000 },
          );
          this.isLoading.set(false);
        },
        complete: () => this.isLoading.set(false),
      });
  }
}
