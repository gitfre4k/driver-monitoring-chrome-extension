import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { IVehicleMaintenance } from '../../../interfaces/vehicle-maintenance.interface';

@Component({
  selector: 'app-dialog-vehicle-maintanence',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './dialog-vehicle-maintanence.component.html',
  styleUrl: './dialog-vehicle-maintanence.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogVehicleMaintanenceComponent {
  readonly dialogRef = inject(MatDialogRef<DialogVehicleMaintanenceComponent>);
  data: IVehicleMaintenance = inject(MAT_DIALOG_DATA);

  onClose(): void {
    this.dialogRef.close(true);
  }
}
