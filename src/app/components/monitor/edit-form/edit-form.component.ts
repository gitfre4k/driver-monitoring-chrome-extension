import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
} from '@angular/core';
import { IEvent } from '../../../interfaces/driver-daily-log-events.interface';
import { TimeInputComponent } from '../../UI/time-input/time-input.component';
import { LocationInputComponent } from '../../UI/location-input/location-input.component';
import { MonitorService } from '../../../@services/monitor.service';
import { FormInputService } from '../../../@services/form-input.service';
import { SaveComponent } from '../../UI/save/save.component';
import { CancelComponent } from '../../UI/cancel/cancel.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '../../../@services/notification.service';
import { ContextMenuService } from '../../../@services/context-menu.service';

@Component({
  selector: 'app-edit-form',
  imports: [
    TimeInputComponent,
    LocationInputComponent,
    SaveComponent,
    CancelComponent,
    MatProgressSpinnerModule,
  ],
  templateUrl: './edit-form.component.html',
  styleUrl: './edit-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditFormComponent {
  event = input.required<IEvent>();
  zone = input.required<string>();

  monitorService = inject(MonitorService);
  formInputService = inject(FormInputService);
  contextMenuService = inject(ContextMenuService);

  @HostListener('document:keyup.enter', ['$event'])
  onDocumentEnter(event: Event) {
    this.updateChanges();
  }
  @HostListener('document:keyup.escape', ['$event'])
  onDocumentEscape(event: Event) {
    this.monitorService.cancelEventEdit();
  }

  private notification = inject(NotificationService);

  updateChanges() {
    setTimeout(() => this.monitorService.selectedEvents.set([]), 0);
    const event = this.monitorService.currentEditEvent();
    const totalVehicleMiles = this.monitorService.newOdometer();
    const eventTypeCode = this.monitorService.newEventType();
    const startTime = this.formInputService.newDate();
    const note = [
      'ChangeToOffDutyStatus',
      'ChangeToSleeperBerthStatus',
      'ChangeToOnDutyNotDrivingStatus',
    ].includes(eventTypeCode)
      ? this.monitorService.newNote()
      : '';

    const duplicateEvent = this.monitorService.duplicateEvent();

    const lat = this.formInputService.latitude();
    const long = this.formInputService.longitude();

    const geolocation = this.formInputService.locationDisplayName();
    const locationSource = 'SelectedFromMap';

    if (isNaN(+lat) || isNaN(+long)) {
      return this.notification.error('Invalid location input', {
        action: 'Close',
      });
    }
    if (!event) {
      this.notification.error(
        `[Monitor Component] error occurred, refreshing page... `,
      );
      return this.monitorService.refresh();
    }
    if (!note) {
      this.notification.error(`[Monitor Component] error: invalid note`);
    }
    if (!startTime) {
      this.notification.error(`[Monitor Component] error: invalid date`);
    }
    if (!totalVehicleMiles) {
      return this.notification.error(
        `[Monitor Component] error: invalid odometer value`,
      );
    }

    this.monitorService.currentEditEvent.set(null);

    const locationInfo = {
      geolocation,
      locationSource,
      latitude: lat,
      longitude: long,
    };

    let payload = { totalVehicleMiles, note, eventTypeCode, startTime };
    if (
      geolocation &&
      this.formInputService.isLatValid() &&
      this.formInputService.isLongValid()
    )
      payload = { ...payload, ...locationInfo };

    if (duplicateEvent) {
      this.monitorService.duplicateEvent.set(false);
      return this.contextMenuService.handleAction('DUPLICATE', event, payload);
    } else
      return this.contextMenuService.handleAction(
        'UPDATE_EVENT',
        event,
        payload,
      );
  }
}
