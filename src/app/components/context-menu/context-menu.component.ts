import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IEvent } from '../../interfaces/driver-daily-log-events.interface';
import { ApiOperationsService } from '../../@services/api-operations.service';
import { AppService } from '../../@services/app.service';
import { MonitorService } from '../../@services/monitor.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TContextMenuAction } from '../../types';

@Component({
  selector: 'app-context-menu',
  imports: [MatIconModule],
  templateUrl: './context-menu.component.html',
  styleUrl: './context-menu.component.scss',
})
export class ContextMenuComponent {
  @Input() x = 0;
  @Input() y = 0;
  @Output() menuAction = new EventEmitter<{ action: string; event: IEvent }>();
  @Input() event: IEvent | null = null;

  apiOperationsService = inject(ApiOperationsService);
  appService = inject(AppService);
  monitorService = inject(MonitorService);
  _snackBar = inject(MatSnackBar);

  currentTenant = this.appService.currentTenant;
  computedEvents = this.monitorService.computedDailyLogEvents;

  handleAction(action: TContextMenuAction) {
    const tenant = this.currentTenant();
    const computedEvents = this.computedEvents();
    const event = this.event;

    if (!event || !tenant) return;

    this._snackBar.open(`action: EXTEND_PTI, event ID: ${event.id}`, 'OK', {
      duration: 2000,
    });

    this.menuAction.emit({ action, event });

    switch (action) {
      case 'EXTEND_PTI': {
        return this.apiOperationsService
          .extendPTI(tenant, event.id, event.pti)
          .subscribe({
            next: () => {
              this.monitorService.refresh.update((value) => value + 1);
              this._snackBar.open(
                'Pre-Trip Inspection is now extended.',
                'OK',
                {
                  duration: 3000,
                }
              );
            },
            error: (err) => {
              this.monitorService.refresh.update((value) => value + 1);
              this._snackBar.open(`Error Occured: ${err.error.message}`, 'OK', {
                duration: 3000,
              });
            },
          });
      }
      case 'ADD_PTI': {
        return this.apiOperationsService.addPTI(tenant, event.id).subscribe({
          next: () => {
            this.monitorService.refresh.update((value) => value + 1);
            this._snackBar.open('Pre-Trip Inspection has been added.', 'OK', {
              duration: 3000,
            });
          },
          error: (err) => {
            this.monitorService.refresh.update((value) => value + 1);
            this._snackBar.open(`Error Occured: ${err.error.message}`, 'OK', {
              duration: 3000,
            });
          },
        });
      }
      case 'DELETE_ALL_ENGINES': {
        const ids: number[] = [];
        computedEvents?.forEach(
          (e) => e.statusName.includes('Engine') && ids.push(e.id)
        );
        if (!ids.length)
          return this._snackBar.open('No engine status detected.', 'OK', {
            duration: 3000,
          });

        return this.apiOperationsService.deleteEvents(tenant, ids).subscribe({
          error: (err) => {
            this.monitorService.refresh.update((value) => value + 1);
            this._snackBar.open(`Error Occured: ${err.error.message}`, 'OK', {
              duration: 3000,
            });
          },
          complete: () => {
            this.monitorService.refresh.update((value) => value + 1);
            this._snackBar.open(
              `${ids.length} engine event${
                ids.length > 1 ? 's' : ''
              } have been deleted.`,
              'OK',
              {
                duration: 3000,
              }
            );
          },
        });
      }
      default:
        return;
    }
  }
}
