import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
} from '@angular/core';
import { MonitorService } from '../../../@services/monitor.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { SaveComponent } from '../../UI/save/save.component';
import { CancelComponent } from '../../UI/cancel/cancel.component';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Duration } from 'luxon';
import { ContextMenuService } from '../../../@services/context-menu.service';

@Component({
  selector: 'app-resize-form',
  imports: [s
    MatProgressSpinnerModule,
    MatSliderModule,
    SaveComponent,
    CancelComponent,
    FormsModule,
  ],
  templateUrl: './resize-form.component.html',
  styleUrl: './resize-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResizeFormComponent {
  monitorService = inject(MonitorService);
  contextMenuService = inject(ContextMenuService);
  private _snackBar = inject(MatSnackBar);

  @HostListener('document:keyup.enter', ['$event'])
  onDocumentEnter(event: Event) {
    this.resize();
  }
  @HostListener('document:keyup.escape', ['$event'])
  onDocumentEscape(event: Event) {
    this.cancelResize();
  }

  resize() {
    const event = this.monitorService.currentResizeDriving();
    const seconds = this.monitorService.newResizeDuration();
    if (!event || !seconds) {
      this._snackBar.open(
        `[Monitor Component] error occurred, refreshing page... `,
        'OK',
        { duration: 3000 },
      );
      return this.monitorService.refresh();
    }
    const duration = Duration.fromObject({ seconds }).toFormat('hh:mm:ss');
    const durationAsTimeSpan = `${new Date().getTime()}`;

    const advancedResize = this.monitorService.showAdvancedResize();
    if (advancedResize) {
      return this.contextMenuService.handleAction('ADVANCED_RESIZE', event, {
        resizePayload: { duration, durationAsTimeSpan },
        parsedErrorInfo: advancedResize,
      });
    }

    return this.contextMenuService.handleAction('RESIZE', event, {
      duration,
      durationAsTimeSpan,
    });
  }

  cancelResize() {
    this.monitorService.currentResizeDriving.set(null);
    this.monitorService.newResizeSpeed.set(0);
    this.monitorService.showResize.set(null);
    this.monitorService.showAdvancedResize.set(null);
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const isResizingEvent = this.monitorService.isResizingEvent();
    const newResizeSpeed = this.monitorService.newResizeSpeed();

    if (isResizingEvent) return;

    let constDown = -0.06;
    let constUp = 0.07;

    if (newResizeSpeed < 70) {
      constDown = -0.19;
      constUp = 0.22;
    }
    if (newResizeSpeed < 66) {
      constDown = -0.25;
      constUp = 0.28;
    }
    if (newResizeSpeed < 64) {
      constDown = -0.44;
      constUp = 0.49;
    }
    if (newResizeSpeed < 62) {
      constDown = -0.76;
      constUp = 0.77;
    }
    if (newResizeSpeed < 50) {
      constDown = -1.66;
      constUp = 1.77;
    }

    const delta = event.deltaY > 0 ? constDown : constUp;
    let newSliderValue = newResizeSpeed + delta;
    if (newSliderValue < 0.01) newSliderValue = 0.01;
    if (newSliderValue > 99.99) newSliderValue = 99.99;

    this.monitorService.newResizeSpeed.set(newSliderValue);
  }
}
