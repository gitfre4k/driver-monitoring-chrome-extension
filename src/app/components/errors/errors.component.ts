import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ProgressBarService } from "../../@services/progress-bar.service";
import { MatButtonModule } from "@angular/material/button";
import { ScanErrorListComponent } from "../scan-error-list/scan-error-list.component";

@Component({
  selector: "app-errors",
  imports: [MatButtonModule, ScanErrorListComponent],
  templateUrl: "./errors.component.html",
  styleUrl: "./errors.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorsComponent {
  private progressBarService = inject(ProgressBarService);
  errCount = this.progressBarService.errorCount;

  dismiss() {
    this.progressBarService.showErrors.set(false);
    this.progressBarService.clearErrors();
  }
}
