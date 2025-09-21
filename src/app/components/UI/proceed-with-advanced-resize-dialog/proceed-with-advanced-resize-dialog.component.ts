import { Component, Inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { ResizeComponent } from "../resize/resize.component";

@Component({
  selector: "app-proceed-with-advanced-resize-dialog",
  imports: [MatButtonModule, MatDialogModule, MatIconModule, ResizeComponent],
  templateUrl: "./proceed-with-advanced-resize-dialog.component.html",
  styleUrl: "./proceed-with-advanced-resize-dialog.component.scss",
})
export class ProceedWithAdvancedResizeDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ProceedWithAdvancedResizeDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title: string;
      message: string;
      info?: string | null;
      warning?: string | null;
    },
  ) {}

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onYesClick(): void {
    this.dialogRef.close(true);
  }
}
