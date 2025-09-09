import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { CdkMenuModule } from '@angular/cdk/menu';

import { TContextMenuAction } from '../../../types';
import { IEvent } from '../../../interfaces/driver-daily-log-events.interface';
import { ContextMenuService } from '../../../@services/context-menu.service';
import { IShiftInputState } from '../../../interfaces/api.interface';
import { DialogComponent } from '../../UI/dialog/dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { DialogConfirmComponent } from '../../UI/dialog-confirm/dialog-confirm.component';

@Component({
  selector: 'app-monitor-menu',
  imports: [MatIconModule, MatRippleModule, CdkMenuModule],
  templateUrl: './monitor-menu.component.html',
  styleUrl: './monitor-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitorMenuComponent {
  selectedEvents = input<IEvent[]>([]);
  contextMenuService = inject(ContextMenuService);

  readonly dialog = inject(MatDialog);
  private _snackBar: any;

  onMenuAction(action: TContextMenuAction) {
    this.contextMenuService.handleAction(action);
  }

  onShiftAction() {
    const _dialogRef = this.dialog.open(DialogComponent);
    const selectedEvents = this.selectedEvents();
    if (!selectedEvents) {
      this._snackBar.open(
        `Shift operation failed. \n[selectedEvents] ${selectedEvents}`,
        'OK',
        { duration: 7000 },
      );
      return;
    }

    _dialogRef.afterClosed().subscribe({
      next: (payload: IShiftInputState) => {
        this.contextMenuService.handleMultiEventAction(
          'SHIFT_EVENTS',
          selectedEvents,
          payload,
        );
      },
    });
  }

  onDeleteSelectedAction() {
    const events = this.selectedEvents();

    if (events.length === 0) {
      return this._snackBar.open(
        `Delete operation failed. \nNo event has been selected.`,
        'OK',
        { duration: 7000 },
      );
    }

    const eventsOnSameDay = events.every((ev) => ev.date === events[0].date);

    const dialogRef = this.dialog.open(DialogConfirmComponent, {
      width: '250px',
      data: {
        title: 'Delete Events',
        message: `Are you sure you want to proceed?`,
        info: `[${events.length}] event${events.length === 1 ? '' : 's'} selected`,
        warning: eventsOnSameDay ? null : 'NOT ALL EVENTS ARE ON THE SAME DAY',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log('The dialog was closed', result);
      if (result) {
        this.contextMenuService.handleMultiEventAction(
          'DELETE_SELECTED_EVENTS',
          events,
        );
      }
    });
  }
}
