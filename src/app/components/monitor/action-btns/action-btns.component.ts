import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from "@angular/core";
import { MatBadgeModule } from "@angular/material/badge";
import { MatIconModule } from "@angular/material/icon";
import { MonitorService } from "../../../@services/monitor.service";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { CdkMenuModule } from "@angular/cdk/menu";
import { MonitorMenuComponent } from "../monitor-menu/monitor-menu.component";
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";

import { IVehicle } from "../../../interfaces/driver-daily-log-events.interface";
import { ApiPrologsAdminService } from "../../../@services/api-prologs-admin.service";
import { MatDialog } from "@angular/material/dialog";
import { DialogVehicleMaintanenceComponent } from "../../UI/dialog-vehicle-maintanence/dialog-vehicle-maintanence.component";
import { switchMap, tap } from "rxjs";
import { MatSnackBar } from "@angular/material/snack-bar";
import { ContextMenuService } from "../../../@services/context-menu.service";
import { ApiService } from "../../../@services/api.service";
import { DateTime } from "luxon";
import { UrlService } from "../../../@services/url.service";

@Component({
  selector: "app-action-btns",
  imports: [
    MatIconModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    CdkMenuModule,
    MonitorMenuComponent,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: "./action-btns.component.html",
  styleUrl: "./action-btns.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionBtnsComponent {
  vehicles = input<IVehicle[]>();
  tenantId = input<string>();

  monitorService = inject(MonitorService);
  apiService = inject(ApiService);
  apiPrologsAdminService = inject(ApiPrologsAdminService);
  contextMenuService = inject(ContextMenuService);
  urlService = inject(UrlService);
  _dialog = inject(MatDialog);
  _snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  isSmartFix = signal(false);

  deselectAllEvents() {
    this.monitorService.selectedEvents.set([]);
  }

  smartFix() {
    const ddle = this.monitorService.driverDailyLog();
    if (!ddle) return;

    const to = ddle.date;
    const from = DateTime.fromISO(to).minus({ days: 7 }).toUTC().toISO()!;
    const tenantId = this.tenantId()!;
    const driverId = ddle.driverId;
    this.isSmartFix.set(true);

    this.apiService
      .smartFix(from, to, tenantId, driverId)
      .pipe()
      .subscribe({
        next: (res) => {
          this.isSmartFix.set(false);
          this.monitorService.refreshDailyLogs();
          this.urlService.refreshWebApp();
          if (res[0] && res[0].errorMessage) {
            this._snackBar.open(
              `[Smart Fix] Error: ${res[0].errorMessage}`,
              "OK",
            );
          } else this._snackBar.open("Smart fix performed successfully", "OK");
        },
        error: (err) => {
          this.isSmartFix.set(false);
          this._snackBar.open(err.error.message, "Close");
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
          this._snackBar.open(`[ERROR] ${err.message ?? err.error.message}`);
          this.isLoading.set(false);
        },
        complete: () => this.isLoading.set(false),
      });
  }
}
