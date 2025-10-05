import { Component, inject } from "@angular/core";
import { ProgressBarService } from "../../@services/progress-bar.service";
import { MatButtonModule } from "@angular/material/button";

@Component({
  selector: "app-errors",
  imports: [MatButtonModule],
  templateUrl: "./errors.component.html",
  styleUrl: "./errors.component.scss",
})
export class ErrorsComponent {
  private progressBarService = inject(ProgressBarService);
  errCount = this.progressBarService.errorCount;
  vErrors = this.progressBarService.vErrors;
  dErrors = this.progressBarService.dErrors;
  pErrors = this.progressBarService.pErrors;
  aErrors = this.progressBarService.aErrors;
  cErrors = this.progressBarService.cErrors;
  adminErrors = this.progressBarService.adminErrors;

  constructor() {}

  dismiss() {
    this.progressBarService.showErrors.set(false);
    this.progressBarService.clearErrors();
  }
}
