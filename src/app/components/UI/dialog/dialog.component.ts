import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { TimeInputComponent } from '../clock/time-input.component';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import {
  IHoursOutput,
  IMinutesOutput,
} from '../../../interfaces/api.interface';

@Component({
  selector: 'app-dialog',
  imports: [
    FormsModule,
    TimeInputComponent,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
  ],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
})
export class DialogComponent {
  readonly dialogRef = inject(MatDialogRef<DialogComponent>);

  direction = signal<'Past' | 'Future'>('Past');
  hh = signal('');
  mm = signal('');
  time = computed(() => {
    const hh = this.hh();
    const mm = this.mm();
    return `${hh}:${mm}`;
  });

  onMouseWheel(event: WheelEvent) {
    event.preventDefault();
    this.direction.set(event.deltaY > 0 ? 'Past' : 'Future');
  }

  handleHoursInputChange(event: IHoursOutput) {
    this.hh.set(event.hours);
  }

  handleMinutesInputChange(event: IMinutesOutput) {
    this.mm.set(event.minutes);
  }

  onShift() {
    this.dialogRef.close({
      direction: this.direction(),
      time: this.time(),
    });
  }

  onClose() {
    this.dialogRef.close({ direction: this.direction });
  }
}
