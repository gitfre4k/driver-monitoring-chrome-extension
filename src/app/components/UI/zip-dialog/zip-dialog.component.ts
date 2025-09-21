import { Component, inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { IEvent } from "../../../interfaces/driver-daily-log-events.interface";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatRadioModule } from "@angular/material/radio";
import { ZipService } from "../../../@services/zip.service";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-zip-dialog",
  imports: [CommonModule, MatButtonModule, MatRadioModule, FormsModule],
  templateUrl: "./zip-dialog.component.html",
  styleUrl: "./zip-dialog.component.scss",
})
export class ZipDialogComponent {
  zipService = inject(ZipService);
  readonly dialogRef = inject(MatDialogRef<ZipDialogComponent>);
  data: IEvent[] = inject(MAT_DIALOG_DATA);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onProceed(): void {
    this.dialogRef.close(true);
  }
}
