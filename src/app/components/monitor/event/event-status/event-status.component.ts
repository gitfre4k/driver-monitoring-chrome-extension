import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  ViewChild,
} from '@angular/core';
import { IEvent } from '../../../../interfaces/driver-daily-log-events.interface';
import { KeyboardService } from '../../../../@services/keyboard.service';
import { MonitorService } from '../../../../@services/monitor.service';
import { CommonModule } from '@angular/common';
import { FormInputService } from '../../../../@services/form-input.service';
import { IntermediateComponent } from '../../../UI/intermediate/intermediate.component';
import { EngineOnComponent } from '../../../UI/engine-on/engine-on.component';
import { EngineComponent } from '../../../UI/engine/engine.component';
import { getNoSpaceNote } from '../../../../helpers/monitor.helpers';
import { FormsModule } from '@angular/forms';
import { getStatusName } from '../../../../helpers/app.helpers';
import { A11yModule } from '@angular/cdk/a11y';
import { TEventTypeCode } from '../../../../types';

@Component({
  selector: 'app-event-status',
  imports: [
    CommonModule,
    IntermediateComponent,
    EngineOnComponent,
    EngineComponent,
    FormsModule,
    A11yModule,
  ],
  templateUrl: './event-status.component.html',
  styleUrl: './event-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventStatusComponent {
  event = input.required<IEvent>();

  @ViewChild('inputRef') myInputField!: ElementRef<HTMLInputElement>;

  keyboardService = inject(KeyboardService);
  monitorService = inject(MonitorService);
  formInputService = inject(FormInputService);

  newStatusName = computed(() => {
    return getStatusName(this.monitorService.newEventType());
  });

  getNoSpaceNote = getNoSpaceNote;

  handleDoubleClick(event: IEvent) {
    this.monitorService.selectedEvents.set([]);

    this.monitorService.currentResizeDriving.set(null);
    this.monitorService.showResize.set(null);
    this.monitorService.newResizeSpeed.set(0);

    this.monitorService.currentEditEvent.set(event);
    this.monitorService.showUpdateEvent.set(event.id);
    this.monitorService.newOdometer.set(event.odometer);

    this.formInputService.geolocation.set(null);
    this.formInputService.latitude.set('');
    this.formInputService.longitude.set('');

    let type: TEventTypeCode[];
    if (
      this.monitorService.eventTypes.includes(
        event.dutyStatus as TEventTypeCode,
      )
    ) {
      type = this.monitorService.eventTypes;
      this.monitorService.isStatusGroupType.set(false);
    } else {
      type = this.monitorService.statusTypes;
      this.monitorService.isStatusGroupType.set(true);
    }

    this.monitorService.newEventTypeId.set(
      type.findIndex((type) => type === event.dutyStatus),
    );
    this.monitorService.newNote.set('');
    if (
      [
        'ChangeToOffDutyStatus',
        'ChangeToSleeperBerthStatus',
        'ChangeToOnDutyNotDrivingStatus',
      ].includes(event.dutyStatus)
    ) {
      this.monitorService.newNote.set(event.notes);
    }

    return;
  }

  onEditStatusWheel(wheelEvent: WheelEvent) {
    wheelEvent.preventDefault();
    let toggle = this.monitorService.newEventTypeId();
    const isStatusGroupType = this.monitorService.isStatusGroupType();

    const type = isStatusGroupType
      ? this.monitorService.statusTypes
      : this.monitorService.eventTypes;

    const maxToggle = type.length - 1;

    if (wheelEvent.deltaY > 0) {
      toggle === maxToggle ? (toggle = 0) : toggle++;
    } else {
      toggle === 0 ? (toggle = maxToggle) : toggle--;
    }

    this.monitorService.newEventTypeId.set(toggle);
  }

  isSpeedLegit(speed: number) {
    return typeof speed === 'number';
  }

  ngAfterViewInit(): void {
    this.myInputField && this.myInputField.nativeElement.focus();
  }
}
