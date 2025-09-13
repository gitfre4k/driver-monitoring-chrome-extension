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
import { MatDialog } from '@angular/material/dialog';
import { MonitorService } from '../../../@services/monitor.service';
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
  monitorService = inject(MonitorService);

  readonly dialog = inject(MatDialog);

  onMenuAction(action: TContextMenuAction) {
    this.contextMenuService.handleAction(action);
  }

  onShiftAction() {
    this.monitorService.openShiftDialog();
  }

  onDeleteSelectedAction() {
    const events = this.selectedEvents();
    if (events.length === 0) return;

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
      if (result) {
        this.contextMenuService.handleMultiEventAction(
          'DELETE_SELECTED_EVENTS',
          events,
        );
      }
    });
  }
}
