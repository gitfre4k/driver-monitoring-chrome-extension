import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { formatTenantName } from '../../../helpers/monitor.helpers';
import { BackendService } from '../../../@services/backend.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { IVehicle } from '../../../interfaces/driver-daily-log-events.interface';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';

import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-dialog-add-note',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatSelectModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './dialog-add-note.component.html',
  styleUrl: './dialog-add-note.component.scss',
})
export class DialogAddNoteComponent {
  private backendService = inject(BackendService);
  private _snackBar = inject(MatSnackBar);

  readonly dialogRef = inject(MatDialogRef<DialogAddNoteComponent>);
  readonly range = new FormGroup({
    start: new FormControl<Date | null>(null, Validators.required),
    end: new FormControl<Date | null>(null, Validators.required),
  });

  rangeValueSignal = toSignal(this.range.valueChanges, {
    initialValue: this.range.value,
  });

  rangeStatusSignal = toSignal(this.range.statusChanges, {
    initialValue: this.range.status,
  });

  data = inject(MAT_DIALOG_DATA);
  note = signal('');
  isPosting = signal(false);

  isVehicleIssue = signal(false);
  selectedVehicle = signal<IVehicle | null>(null);
  selectedMarkerColor = signal<
    | 'EngineShutDownConventionalLocationPrecision'
    | 'EngineShutDownReducedLocationPrecision'
    | 'EnginePowerUpConventionalLocationPrecision'
    | 'EnginePowerUpReducedLocationPrecision'
    | null
  >(null);

  isMarkerForDriver = signal(true);

  formatTenantName = formatTenantName;

  onNoClick(): void {
    this.dialogRef.close();
  }
  onAddClick(
    eventTypeCode:
      | 'ChangeToOffDutyStatus'
      | 'ChangeToSleeperBerthStatus'
      | 'ChangeToOnDutyNotDrivingStatus'
      | 'IntermediateLogConventionalLocationPrecision'
      | 'EnginePowerUpConventionalLocationPrecision'
      | 'EngineShutDownConventionalLocationPrecision',
    $event?: Event,
  ) {
    if (!this.note()) return;
    const { start, end } = this.rangeValueSignal();
    if (
      eventTypeCode === 'IntermediateLogConventionalLocationPrecision' &&
      (!start || !end)
    )
      return;

    this.isPosting.set(true);

    const vehicleData = this.isVehicleIssue() ? this.selectedVehicle() : null;
    const selectedMarkerColor = this.selectedMarkerColor()!;
    const note =
      eventTypeCode === 'IntermediateLogConventionalLocationPrecision'
        ? JSON.stringify({ start, end, note: this.note().trim() })
        : this.note().trim();

    this.backendService
      .uploadData(
        this.data.tenant,
        this.data.driver,
        note,
        ![
          'EngineShutDownConventionalLocationPrecision',
          'EnginePowerUpConventionalLocationPrecision',
        ].includes(eventTypeCode)
          ? eventTypeCode
          : selectedMarkerColor,
        vehicleData,
      )
      .subscribe({
        error: () => {
          this._snackBar.open('Error posting note', 'Close', {
            duration: 3000,
          });
          this.isPosting.set(false);
        },
        complete: () => {
          this._snackBar.open('Note successfully posted', 'Close', {
            duration: 3000,
          });
          this.backendService.loadShiftReport();
          this.isPosting.set(false);
          this.dialogRef.close(true);
        },
      });
  }
}
