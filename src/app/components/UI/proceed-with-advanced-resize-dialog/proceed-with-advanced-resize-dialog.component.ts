import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ResizeComponent } from '../resize/resize.component';
import { IEvent } from '../../../interfaces/driver-daily-log-events.interface';
import { DateTime, Duration } from 'luxon';

@Component({
  selector: 'app-proceed-with-advanced-resize-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, ResizeComponent],
  templateUrl: './proceed-with-advanced-resize-dialog.component.html',
  styleUrl: './proceed-with-advanced-resize-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProceedWithAdvancedResizeDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ProceedWithAdvancedResizeDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title: string;
      message: string;
      info?: string | null;
      warning?: string | null;
      event?: IEvent;
    },
  ) {}

  getRealTime(time: string, offset: number) {
    const dt = DateTime.fromISO(time).toUTC().plus({ minutes: offset });
    return (
      dt.toFormat('hh:mm:ss') + ` ${+dt.toFormat('HH') >= 12 ? 'PM' : 'AM'}`
    );
  }

  getDurationTime(seconds: number) {
    return Duration.fromObject({ seconds })
      .toFormat('hh:mm')
      .slice(1)
      .split(':')
      .map((part) => (part.length === 1 ? part + 'h' : part + 'm'))
      .join(' ');
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onYesClick(): void {
    this.dialogRef.close(true);
  }
}
