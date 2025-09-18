import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatSnackBar } from "@angular/material/snack-bar";

import { MonitorService } from "../../../@services/monitor.service";
import { FormInputService } from "../../../@services/form-input.service";

import { IEvent } from "../../../interfaces/driver-daily-log-events.interface";
import { ApiOperationsService } from "../../../@services/api-operations.service";
import { tap } from "rxjs";

@Component({
  selector: "app-location-input",
  imports: [FormsModule],
  templateUrl: "./location-input.component.html",
  styleUrl: "./location-input.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationInputComponent {
  event = input<IEvent>();
  monitorService = inject(MonitorService);
  formInputService = inject(FormInputService);
  apiOperationService = inject(ApiOperationsService);
  _snackBar = inject(MatSnackBar);

  ngOnInit() {
    const inputEvent = this.event();
    if (!inputEvent) return;

    this.formInputService.geolocation.set(inputEvent.locationDisplayName ?? "");

    this.apiOperationService
      .getEvent(inputEvent.tenant, inputEvent.id)
      .pipe(
        tap((eventDetails) => {
          this.formInputService.latitude.set(eventDetails.latitude);
          this.formInputService.longitude.set(eventDetails.longitude);
        }),
      )
      .subscribe();
  }

  onLatLongPaste(event: ClipboardEvent) {
    let clipboardData = event.clipboardData!;
    let pastedText = clipboardData.getData("text");

    const [lat, long] = pastedText.split(",");

    setTimeout(() => {
      this.formInputService.latitude.set(lat);
      this.formInputService.longitude.set(long);
    }, 50);
  }
}
