import { Component, inject, signal } from "@angular/core";
import { BackendService } from "../../@services/backend.service";
import { KeyValuePipe } from "@angular/common";
import { ITenant } from "../../interfaces";
import { DateService } from "../../@services/date.service";
import { UrlService } from "../../@services/url.service";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDialog } from "@angular/material/dialog";
import { DialogAddNoteComponent } from "../UI/dialog-add-note/dialog-add-note.component";

@Component({
  selector: "app-shift-report",
  imports: [KeyValuePipe, MatIconModule, MatTooltipModule, MatButtonModule],
  templateUrl: "./shift-report.component.html",
  styleUrl: "./shift-report.component.scss",
})
export class ShiftReportComponent {
  backendService = inject(BackendService);
  dateService = inject(DateService);
  urlService = inject(UrlService);

  readonly dialog = inject(MatDialog);
  readonly animal = signal("");

  openLogs(id: number, date: string, tenant: ITenant, openLogs?: boolean) {
    openLogs
      ? this.urlService.navigateChromeActiveTab(
          `https://app.monitoringdriver.com/logs/${id}/`,
          tenant,
          true,
        )
      : this.urlService.navigateChromeActiveTab(
          `https://app.monitoringdriver.com/logs/${id}/${date}/`,
          tenant,
        );
  }

  addNote() {
    const dialogRef = this.dialog.open(DialogAddNoteComponent, {
      data: { animal: this.animal() },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log("The dialog was closed");
      if (result !== undefined) {
        this.animal.set(result);
      }
    });
  }
}
