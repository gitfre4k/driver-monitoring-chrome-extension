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
import { ZipService } from '../../../@services/zip.service';
import { MOCK__EVENT_DETAILS } from '../../../data/mock-ddle';
import { concatMap, delay, from, mergeMap, tap, toArray } from 'rxjs';
import { ApiOperationsService } from '../../../@services/api-operations.service';
import { IEventDetails, ITenant } from '../../../interfaces';
import { UrlService } from '../../../@services/url.service';

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
  zipService = inject(ZipService);
  apiOperationsService = inject(ApiOperationsService);
  urlService = inject(UrlService);

  readonly dialog = inject(MatDialog);

  onLoadMockLog() {
    from(MOCK__EVENT_DETAILS)
      .pipe(
        concatMap((eventDetails) =>
          this.apiOperationsService.createEvent(
            '3a0e2d3b-8214-edb4-c139-0d55051fc170',
            eventDetails as IEventDetails,
          ),
        ),
        toArray(),
      )
      .subscribe({ next: (data) => console.log(data) });
  }

  onSaveEvents() {
    const events = this.monitorService.selectedEvents();
    return from(events)
      .pipe(
        mergeMap((event) =>
          this.apiOperationsService.getEvent(
            { id: '3a0e2d3b-8214-edb4-c139-0d55051fc170' } as ITenant,
            event.id,
          ),
        ),
        toArray(),
        tap((x) => console.log(x)),
      )
      .subscribe();
  }

  onZipAction() {
    const tenant = this.urlService.tenant();
    const logInfo = this.urlService.currentView();
    if (!tenant || !logInfo) return;
    const { driverId, date } = logInfo;
    return this.zipService.zip(tenant, driverId, date);
  }

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
