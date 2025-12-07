import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import {
  IDriverFmcsaInspection,
  IDriverLogViolation,
  IEvent,
} from '../../../interfaces/driver-daily-log-events.interface';
import { DateTime } from 'luxon';
import { KeyboardService } from '../../../@services/keyboard.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MonitorService } from '../../../@services/monitor.service';


import { getStatusDuration } from '../../../helpers/app.helpers';
import { DurationPipe } from '../../../pipes/duration.pipe';
import { ContextMenuService } from '../../../@services/context-menu.service';
import { EventStatusComponent } from './event-status/event-status.component';
import { FormsModule } from '@angular/forms';
import { ConstantsService } from '../../../@services/constants.service';

@Component({
  selector: 'app-event',
  imports: [DurationPipe, EventStatusComponent, FormsModule],
  templateUrl: './event.component.html',
  styleUrl: './event.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventComponent {
  event = input.required<IEvent>();
  violations = input.required<IDriverLogViolation[]>();

  monitorService = inject(MonitorService);
  keyboardService = inject(KeyboardService);
  constantsService = inject(ConstantsService);

  contextMenuService = inject(ContextMenuService);

  private _snackBar = inject(MatSnackBar);

  getStatusDuration = getStatusDuration;

  markBreaksAndShift(event: IEvent) {
    let breakShift = '';

    if (event.driver.id === event.driver.viewId) {
      switch (event.break) {
        case 0:
          breakShift = 'shift';
          break;
        case 10:
          breakShift = 'ten-hour-break';
          break;
        case 34:
          breakShift = 'cycle-break';
          break;
        default:
          breakShift = 'undefined';
          break;
      }
    }

    return breakShift;
  }

  addViolationClass(event: IEvent, violations: IDriverLogViolation[]) {
    let isViolation = false;
    const eventStartTime = DateTime.fromISO(event.realStartTime)
      .toJSDate()
      .getTime();
    violations.forEach((v) => {
      if (v.startTime <= eventStartTime && v.endTime >= eventStartTime)
        isViolation = true;
    });
    return isViolation;
  }

  copyValue(value: string) {
    if (!this.keyboardService.ctrlPressed()) return;
    navigator.clipboard.writeText(value);
    this._snackBar.open(`Copied: ${value}`, 'OK', { duration: 1500 });
  }
  copyLocation(event: IEvent) {
    this.contextMenuService.handleAction('COPY_LOCATION', event);
  }
}
