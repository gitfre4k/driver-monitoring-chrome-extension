import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  Inject,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface IClearMemoryDialogData {
  /** Countdown length in seconds (60 for the initial dialog, 30 for the final
   *  post-postpone dialog). */
  startSeconds: number;
}

/** Result emitted by the dialog: reboot immediately (also on countdown 0) or
 *  postpone the reboot. */
export type TClearMemoryResult = 'reboot' | 'postpone';

/**
 * Countdown dialog shown at a live scheduled cleanup slot. It counts down to a
 * reboot that clears the extension's local hidden-results memory. The user can
 * reboot now or postpone; reaching 00:00 reboots automatically. Opened with
 * `disableClose` so only the two buttons (or the timer) can resolve it.
 */
@Component({
  selector: 'app-clear-memory-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './clear-memory-dialog.component.html',
  styleUrl: './clear-memory-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClearMemoryDialogComponent {
  private destroyRef = inject(DestroyRef);

  remaining = signal(0);
  display = computed(() => {
    const total = Math.max(0, this.remaining());
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  constructor(
    public dialogRef: MatDialogRef<ClearMemoryDialogComponent, TClearMemoryResult>,
    @Inject(MAT_DIALOG_DATA) public data: IClearMemoryDialogData,
  ) {
    this.remaining.set(data.startSeconds);

    const intervalId = setInterval(() => {
      this.remaining.update((value) => value - 1);
      if (this.remaining() <= 0) {
        clearInterval(intervalId);
        this.dialogRef.close('reboot');
      }
    }, 1000);

    this.destroyRef.onDestroy(() => clearInterval(intervalId));
  }

  rebootNow() {
    this.dialogRef.close('reboot');
  }

  postpone() {
    this.dialogRef.close('postpone');
  }
}
