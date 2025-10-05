import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
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
import { switchMap } from "rxjs";

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
  ],
  templateUrl: "./action-btns.component.html",
  styleUrl: "./action-btns.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionBtnsComponent {
  vehicles = input<IVehicle[]>();
  tenantId = input<string>();

  monitorService = inject(MonitorService);
  apiPrologsAdminService = inject(ApiPrologsAdminService);
  _dialog = inject(MatDialog);

  deselectAllEvents() {
    this.monitorService.selectedEvents.set([]);
  }

  getVehicleMaintenance() {
    const tenantId = this.tenantId();
    const vehicles = this.vehicles();
    if (!tenantId || !vehicles || !vehicles.length) return;

    return this.apiPrologsAdminService
      .getVehicleMaintenance(tenantId, vehicles.at(-1)!.id)
      .pipe(
        switchMap((data) =>
          this._dialog
            .open(DialogVehicleMaintanenceComponent, { data })
            .afterClosed(),
        ),
      )
      .subscribe();
  }
}
