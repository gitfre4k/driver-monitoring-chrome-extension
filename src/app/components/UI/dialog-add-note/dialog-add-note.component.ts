import { Component, inject, signal } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";

import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { formatTenantName } from "../../../helpers/monitor.helpers";
import { BackendService } from "../../../@services/backend.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ExtensionTabNavigationService } from "../../../@services/extension-tab-navigation.service";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatSelectModule } from "@angular/material/select";
import { IVehicle } from "../../../interfaces/driver-daily-log-events.interface";

@Component({
  selector: "app-dialog-add-note",
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatSelectModule,
  ],
  templateUrl: "./dialog-add-note.component.html",
  styleUrl: "./dialog-add-note.component.scss",
})
export class DialogAddNoteComponent {
  private backendService = inject(BackendService);
  private extTabNavService = inject(ExtensionTabNavigationService);
  private _snackBar = inject(MatSnackBar);

  readonly dialogRef = inject(MatDialogRef<DialogAddNoteComponent>);
  data = inject(MAT_DIALOG_DATA);
  note = signal("");
  isPosting = signal(false);
  isVehicleIssue = signal(false);
  selectedVehicle = signal<IVehicle | null>(null);

  formatTenantName = formatTenantName;

  onNoClick(): void {
    this.dialogRef.close();
  }
  onAddClick(
    eventTypeCode:
      | "ChangeToOffDutyStatus"
      | "ChangeToSleeperBerthStatus"
      | "ChangeToOnDutyNotDrivingStatus"
      | "IntermediateLogConventionalLocationPrecision"
      | "EnginePowerUpConventionalLocationPrecision"
      | "EngineShutDownConventionalLocationPrecision",
    $event?: Event,
  ) {
    if (!this.note()) return;

    if ($event) $event.preventDefault();

    this.isPosting.set(true);

    const vehicleData = this.isVehicleIssue() ? this.selectedVehicle() : null;

    this.backendService
      .uploadData(
        this.data.tenant,
        this.data.driver,
        this.note().trimEnd(),
        eventTypeCode,
        vehicleData,
      )
      .subscribe({
        error: () => {
          this._snackBar.open("Error posting note", "Close", {
            duration: 3000,
          });
          this.isPosting.set(false);
        },
        complete: () => {
          this._snackBar.open("Note successfully posted", "Close", {
            duration: 3000,
          });
          this.extTabNavService.selectedTabIndex.set(3);
          this.backendService.loadShiftReport();
          this.isPosting.set(false);
          this.dialogRef.close(true);
        },
      });
  }
}
