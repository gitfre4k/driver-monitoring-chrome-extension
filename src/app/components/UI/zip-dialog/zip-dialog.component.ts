import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { ZipService } from '../../../@services/zip.service';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { IZipInitializationData } from '../../../interfaces/zip.interface';
import { Observable } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { subtractTimes } from '../../../helpers/zip.helpers';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-zip-dialog',
  imports: [
    CommonModule,
    MatButtonModule,
    MatRadioModule,
    FormsModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './zip-dialog.component.html',
  styleUrl: './zip-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZipDialogComponent {
  zipService = inject(ZipService);
  readonly dialogRef = inject(MatDialogRef<ZipDialogComponent>);

  data: { zipData$: Observable<IZipInitializationData> } =
    inject(MAT_DIALOG_DATA);

  @ViewChild('speedInput') speedInput!: ElementRef<HTMLInputElement>;
  @ViewChild('onDutyDurationInput')
  onDutyDurationInput!: ElementRef<HTMLInputElement>;
  @ViewChild('drivingDurationInput')
  drivingDurationInput!: ElementRef<HTMLInputElement>;
  @ViewChild('gapDurationInput')
  gapDurationInput!: ElementRef<HTMLInputElement>;
  @ViewChild('maxSpeedDeviationInput')
  maxSpeedDeviationInput!: ElementRef<HTMLInputElement>;
  @ViewChild('resizeReductionTrashholdInput')
  resizeReductionTrashholdInput!: ElementRef<HTMLInputElement>;
  @ViewChild('shiftTimeFrameInput')
  shiftTimeFrameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('engineOffIdleTimeSpawnInput')
  engineOffIdleTimeSpawnInput!: ElementRef<HTMLInputElement>;

  showEventsToDelete = signal(false);

  subtractTimes = subtractTimes;

  zipDataSignal = toSignal(this.data?.zipData$);
  timeSaved = computed(() => {
    const zipData = this.zipDataSignal();
    const estimatedZippedDuration = this.zipService.estimatedZippedDuration();

    if (!zipData) return { shift: '00:00', drive: '00:00' };

    const shiftDuration = zipData.selectedRangeDuration.shift;

    const driveDuration = zipData.selectedRangeDuration.drive.slice(0, -3);

    const estimatedShiftDuration = estimatedZippedDuration.shift;
    const estimatedDriveDuration = estimatedZippedDuration.drive.slice(0, -3);

    return {
      shift: subtractTimes(shiftDuration, estimatedShiftDuration),
      drive: subtractTimes(driveDuration, estimatedDriveDuration),
    };
  });

  onMouseWheel(
    event: WheelEvent,
    inputType:
      | 'speedInput'
      | 'onDutyDurationInput'
      | 'drivingDurationInput'
      | 'gapDurationInput'
      | 'maxSpeedDeviationInput'
      | 'resizeReductionTrashholdInput'
      | 'shiftTimeFrameInput'
      | 'engineOffIdleTimeSpawnInput',
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
          if (newValue > 10) return 10;
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
      case 'resizeReductionTrashholdInput': {
        if (!this.zipService.resize()) return;

        this.resizeReductionTrashholdInput.nativeElement.focus();

        return this.zipService.resizeReductionTrashhold.update((prevValue) => {
          let newValue = prevValue + (isScrollUp ? 1 : -1);
          if (newValue > 10) return 10;
          else if (newValue < 0) return 0;
          else return newValue;
        });
      }
      case 'shiftTimeFrameInput': {
        if (!this.zipService.shift()) return;

        this.shiftTimeFrameInput.nativeElement.focus();

        return this.zipService.shiftMinTimeFrame.update((prevValue) => {
          let newValue = prevValue + (isScrollUp ? 1 : -1);
          if (newValue > 15) return 15;
          else if (newValue < 0) return 0;
          else return newValue;
        });
      }

      case 'maxSpeedDeviationInput': {
        if (!this.zipService.resize()) return;

        this.maxSpeedDeviationInput.nativeElement.focus();

        return this.zipService.maxSpeedDeviation.update((prevValue) => {
          let newValue = +prevValue.slice(1) + (isScrollUp ? 1 : -1);
          if (newValue > 15) return `±15`;
          else if (newValue < 1) return `±1`;
          else return `±${newValue}`;
        });
      }

      case 'engineOffIdleTimeSpawnInput': {
        if (!this.zipService.shift()) return;

        this.engineOffIdleTimeSpawnInput.nativeElement.focus();

        return this.zipService.engineOffIdleTimeSpawn.update((prevValue) => {
          let newValue = prevValue + (isScrollUp ? 1 : -1);
          if (newValue > 15) return 15;
          else if (newValue < 1) return 1;
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

  onProceed(data: IZipInitializationData): void {
    this.dialogRef.close(data);
  }
}
