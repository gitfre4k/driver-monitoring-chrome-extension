import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { IEvent } from '../../../interfaces/driver-daily-log-events.interface';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { ZipService } from '../../../@services/zip.service';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-zip-dialog',
  imports: [
    CommonModule,
    MatButtonModule,
    MatRadioModule,
    FormsModule,
    MatCheckboxModule,
  ],
  templateUrl: './zip-dialog.component.html',
  styleUrl: './zip-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZipDialogComponent {
  zipService = inject(ZipService);
  readonly dialogRef = inject(MatDialogRef<ZipDialogComponent>);
  data: { eventsToDelete: IEvent[]; selectedRangeDuration: string } =
    inject(MAT_DIALOG_DATA);

  @ViewChild('speedInput') speedInput!: ElementRef<HTMLInputElement>;
  @ViewChild('onDutyDurationInput')
  onDutyDurationInput!: ElementRef<HTMLInputElement>;
  @ViewChild('drivingDurationInput')
  drivingDurationInput!: ElementRef<HTMLInputElement>;
  @ViewChild('gapDurationInput')
  gapDurationInput!: ElementRef<HTMLInputElement>;

  showEventsToDelete = signal(false);

  onMouseWheel(
    event: WheelEvent,
    inputType:
      | 'speedInput'
      | 'onDutyDurationInput'
      | 'drivingDurationInput'
      | 'gapDurationInput',
  ) {
    event.preventDefault();
    const isScrollUp = event.deltaY < 0;

    switch (inputType) {
      case 'speedInput': {
        if (!this.zipService.resize()) return;

        this.speedInput.nativeElement.focus();

        return this.zipService.resizeSpeed.update((prevValue) => {
          let newValue = prevValue + (isScrollUp ? 1 : -1);
          if (newValue > 74) return 74;
          else if (newValue < 1) return 1;
          else return newValue;
        });
      }
      case 'drivingDurationInput': {
        if (!this.zipService.resize()) return;

        this.drivingDurationInput.nativeElement.focus();

        return this.zipService.resizeMinDuration.update((prevValue) => {
          let newValue = prevValue + (isScrollUp ? 1 : -1);
          if (newValue > 15) return 15;
          else if (newValue < 1) return 1;
          else return newValue;
        });
      }
      case 'onDutyDurationInput': {
        if (!this.zipService.shift()) return;

        this.onDutyDurationInput.nativeElement.focus();

        return this.zipService.zippedOnDutyDuration.update((prevValue) => {
          let newValue = prevValue + (isScrollUp ? 1 : -1);
          if (newValue > 60) return 60;
          else if (newValue < 1) return 1;
          else return newValue;
        });
      }
      case 'gapDurationInput': {
        if (!this.zipService.fill()) return;

        this.gapDurationInput.nativeElement.focus();

        return this.zipService.gapMinDuration.update((prevValue) => {
          let newValue = prevValue + (isScrollUp ? 1 : -1);
          if (newValue > 60) return 60;
          else if (newValue < 0) return 0;
          else return newValue;
        });
      }

      default:
        return;
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onProceed(): void {
    this.dialogRef.close(true);
  }
}
