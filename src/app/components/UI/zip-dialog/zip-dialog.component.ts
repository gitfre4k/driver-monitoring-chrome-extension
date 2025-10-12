import { Component, ElementRef, inject, ViewChild } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { IEvent } from "../../../interfaces/driver-daily-log-events.interface";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatRadioModule } from "@angular/material/radio";
import { ZipService } from "../../../@services/zip.service";
import { FormsModule } from "@angular/forms";
import { MatCheckboxModule } from "@angular/material/checkbox";

@Component({
  selector: "app-zip-dialog",
  imports: [
    CommonModule,
    MatButtonModule,
    MatRadioModule,
    FormsModule,
    MatCheckboxModule,
  ],
  templateUrl: "./zip-dialog.component.html",
  styleUrl: "./zip-dialog.component.scss",
})
export class ZipDialogComponent {
  zipService = inject(ZipService);
  readonly dialogRef = inject(MatDialogRef<ZipDialogComponent>);
  data: IEvent[] = inject(MAT_DIALOG_DATA);

  @ViewChild("speedInput") speedInput!: ElementRef<HTMLInputElement>;
  @ViewChild("durationInput") durationInput!: ElementRef<HTMLInputElement>;

  onMouseWheelOnDuty(event: WheelEvent) {
    event.preventDefault();
    if (!this.zipService.zippedOnDuty()) return;

    const isScrollUp = event.deltaY < 0;

    this.durationInput.nativeElement.focus();

    this.zipService.zippedOnDutyDuration.update((prevValue) => {
      let newValue = prevValue + (isScrollUp ? 1 : -1);
      if (newValue > 60) return 60;
      else if (newValue < 1) return 1;
      else return newValue;
    });
  }

  onMouseWheel(event: WheelEvent) {
    event.preventDefault();
    if (!this.zipService.resize()) return;

    const isScrollUp = event.deltaY < 0;

    this.speedInput.nativeElement.focus();

    this.zipService.resizeSpeed.update((prevValue) => {
      let newValue = prevValue + (isScrollUp ? 1 : -1);
      if (newValue > 75) return 75;
      else if (newValue < 1) return 1;
      else return newValue;
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onProceed(): void {
    this.dialogRef.close(true);
  }
}
