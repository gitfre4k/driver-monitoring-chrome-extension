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
  ],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
})
export class DialogComponent {
  readonly dialogRef = inject(MatDialogRef<DialogComponent>);
  contextMenuService = inject(ContextMenuService);
  monitorService = inject(MonitorService);

  direction = signal<'Past' | 'Future'>('Past');
  hh = signal('');
  mm = signal('');
  time = computed(() => {
    const hh = this.hh();
    const mm = this.mm();
    return `${hh}:${mm}`;
  });

  ngOnInit() {
    if (this.monitorService.selectedEvents().length === 0) this.onClose();
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
      },
    );
  }

  onClose() {
    this.dialogRef.close();
  }
}
