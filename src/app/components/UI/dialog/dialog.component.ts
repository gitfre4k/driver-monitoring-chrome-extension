import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { ShiftPeriodComponent } from '../shift-period/shift-period.component';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import {
  IHoursOutput,
  IMinutesOutput,
} from '../../../interfaces/api.interface';
import { ContextMenuService } from '../../../@services/context-menu.service';
import { MonitorService } from '../../../@services/monitor.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DurationPipe } from '../../../pipes/duration.pipe';

@Component({
  selector: 'app-dialog',
  imports: [
    FormsModule,
    ShiftPeriodComponent,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DurationPipe,
  ],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
})
export class DialogComponent {
  readonly dialogRef = inject(MatDialogRef<DialogComponent>);
  contextMenuService = inject(ContextMenuService);
  monitorService = inject(MonitorService);

  direction = signal<'Past' | 'Future'>('Future');
  hh = signal('');
  mm = signal('');
  time = computed(() => {
    const hh = this.hh();
    const mm = this.mm();
    return `${hh}:${mm}`;
  });

  dutyStatusNames = [
    'On Duty',
    'Sleeper Berth',
    'Off Duty',
    'Driving',
    'PC',
    'YM',
  ];

  space = computed(() => {
    const selectedEvents = this.monitorService
      .selectedEvents()
      .sort((a, b) => a.computeIndex - b.computeIndex);
    const logEvents = this.monitorService.computedDailyLogEvents();
    ////////////////////
    if (!logEvents) return null;

    let backward = 0;
    let forward = 0;

    for (let i = selectedEvents[0].computeIndex - 1; i >= 0; i--) {
      if (this.dutyStatusNames.includes(logEvents[i]?.statusName)) {
        if (['Driving', 'PC', 'YM'].includes(logEvents[i]?.statusName)) {
          backward = 0;
          break;
        } else {
          backward = logEvents[i].realDurationInSeconds;
          break;
        }
      }
    }
    for (
      let i = selectedEvents[selectedEvents.length - 1].computeIndex;
      i < logEvents.length;
      i++
    ) {
      if (this.dutyStatusNames.includes(logEvents[i].statusName)) {
        if (
          ['Driving', 'PC', 'YM'].includes(
            selectedEvents[selectedEvents.length - 1].statusName,
          )
        ) {
          backward = 0;
          break;
        } else {
          forward =
            logEvents[i].realDurationInSeconds ??
            logEvents[i].durationInSeconds;
          break;
        }
      }
    }
    return { backward, forward };
  });

  ngOnInit() {
    if (this.monitorService.selectedEvents().length === 0) this.onClose();
    this.monitorService.isShiftingDialogOpen.set(true);
  }

  onMouseWheel(event: WheelEvent) {
    event.preventDefault();

    !this.monitorService.isShifting() &&
      this.direction.set(event.deltaY > 0 ? 'Past' : 'Future');
  }

  handleHoursInputChange(event: IHoursOutput) {
    this.hh.set(event.hours);
  }

  handleMinutesInputChange(event: IMinutesOutput) {
    this.mm.set(event.minutes);
  }

  onShift() {
    this.contextMenuService.handleMultiEventAction(
      'SHIFT_EVENTS',
      this.monitorService.selectedEvents(),
      {
        direction: this.direction(),
        time: this.time(),
        dialogRef: this.dialogRef,
      },
    );
  }

  onClose() {
    this.dialogRef.close();
  }

  ngOnDestroy() {
    this.monitorService.isShiftingDialogOpen.set(false);
  }
}
