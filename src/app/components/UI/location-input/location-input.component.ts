import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MonitorService } from '../../../@services/monitor.service';
import { FormInputService } from '../../../@services/form-input.service';

import { IEvent } from '../../../interfaces/driver-daily-log-events.interface';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-location-input',
  imports: [FormsModule, NgClass],
  templateUrl: './location-input.component.html',
  styleUrl: './location-input.component.scss',
})
export class LocationInputComponent {
  event = input<IEvent>();
  monitorService = inject(MonitorService);
  formInputService = inject(FormInputService);
  _snackBar = inject(MatSnackBar);

  ngOnInit() {
    this.formInputService.geolocation.set(
      this.event()?.locationDisplayName ?? '',
    );
  }

  onLatLongPaste(event: ClipboardEvent) {
    let clipboardData = event.clipboardData!;
    let pastedText = clipboardData.getData('text');

    const [lat, long] = pastedText.split(',');

    setTimeout(() => {
      this.formInputService.latitude.set(lat);
      this.formInputService.longitude.set(long);
    }, 50);
  }
}
