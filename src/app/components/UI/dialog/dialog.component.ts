import {
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { TimeInputComponent } from '../clock/time-input.component';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';

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
  time = signal('');
  direction = signal<'forward' | 'backward'>('backward');

  onMouseWheel(event: WheelEvent) {
    event.preventDefault();
    this.direction.set(event.deltaY > 0 ? 'backward' : 'forward');
  }

  onClose() {
    console.log(this.time());
    this.dialogRef.close();
  }
}
