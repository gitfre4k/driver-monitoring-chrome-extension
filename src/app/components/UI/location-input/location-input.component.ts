import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatSnackBar } from "@angular/material/snack-bar";

import { MonitorService } from "../../../@services/monitor.service";
import { FormInputService } from "../../../@services/form-input.service";

import { IEvent } from "../../../interfaces/driver-daily-log-events.interface";
import { ApiOperationsService } from "../../../@services/api-operations.service";
import { tap } from "rxjs";
import { ILocationData } from "../../../interfaces/api.interface";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";

@Component({
  selector: "app-location-input",
  imports: [FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
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

  editLocation = signal(false);

  onEditLocation() {
    const inputEvent = this.event();
    if (!inputEvent) return;

    this.apiOperationService
      .getEvent(inputEvent.tenant, inputEvent.id)
      .pipe(
        tap((eventDetails) => {
          this.formInputService.latitude.set(eventDetails.latitude);
          this.formInputService.longitude.set(eventDetails.longitude);
        }),
      )
      .subscribe();
    this.editLocation.set(true);
  }

  onLatLongPaste(event: ClipboardEvent) {
    let clipboardData = event.clipboardData!;
    let pastedText = clipboardData.getData("text");

    const [lat, long] = pastedText.split(",");

    setTimeout(() => {
      this.formInputService.latitude.set(lat);
      this.formInputService.longitude.set(long);
      this.apiOperationService
        .getGeolocation(this.event()!.tenant, +lat, +long)
        .subscribe({
          next: this.formInputService.geolocation.set,
          error: () =>
            this.formInputService.geolocation.set({
              distance: NaN,
            } as ILocationData),
        });
    }, 0);
  }
}
