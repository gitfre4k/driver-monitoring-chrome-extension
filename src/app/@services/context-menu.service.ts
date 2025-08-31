import { inject, Injectable } from '@angular/core';
import { ApiOperationsService } from './api-operations.service';
import { AppService } from './app.service';
import { MonitorService } from './monitor.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TContextMenuAction } from '../types';
import { IEvent } from '../interfaces/driver-daily-log-events.interface';

@Injectable({
  providedIn: 'root',
})
export class ContextMenuService {
  apiOperationsService = inject(ApiOperationsService);
  appService = inject(AppService);
  monitorService = inject(MonitorService);
  _snackBar = inject(MatSnackBar);

  computedEvents = this.monitorService.computedDailyLogEvents;

  handleAction(action: TContextMenuAction, event?: IEvent) {
    const tenant = this.appService.currentTenant();
    const computedEvents = this.computedEvents();

    if (!tenant) return;

    this._snackBar.open(
      `[ContextMenuService] executing action: ${action}`,
      'OK',
      {
        duration: 2000,
      }
    );

    switch (action) {
      case 'EXTEND_PTI': {
        if (!event) return;
        this.monitorService.extendPTIBtnDisabled.set(true);
        return this.apiOperationsService
          .extendPTI(tenant, event.id, event.pti)
          .subscribe({
            error: (err) => {
              this.monitorService.refresh.update((value) => value + 1);
              this._snackBar.open(`Error Occured: ${err.error.message}`, 'OK', {
                duration: 3000,
              });
            },
            complete: () => {
              this.monitorService.refresh.update((value) => value + 1);
              setTimeout(
                () => this.monitorService.extendPTIBtnDisabled.set(false),
                2000
              );
              this._snackBar.open(
                'Pre-Trip Inspection is now extended.',
                'OK',
                {
                  duration: 3000,
                }
              );
            },
          });
      }
      case 'ADD_PTI':
      case 'ADD_ENGINE_OFF': {
        if (!event) return;
        action === 'ADD_PTI' && this.monitorService.addPTIBtnDisabled.set(true);
        return this.apiOperationsService[
          action === 'ADD_PTI' ? 'addPTI' : 'addEngineOff'
        ](tenant, event.id).subscribe({
          error: (err) => {
            this.monitorService.refresh.update((value) => value + 1);
            this._snackBar.open(`Error Occured: ${err.error.message}`, 'OK', {
              duration: 7000,
            });
          },
          complete: () => {
            this.monitorService.refresh.update((value) => value + 1);
            action === 'ADD_PTI' &&
              setTimeout(
                () => this.monitorService.addPTIBtnDisabled.set(false),
                2000
              );
            this._snackBar.open(
              `${
                action === 'ADD_PTI' ? 'Pre-Trip Inspection' : 'Engine Off'
              } has been added.`,
              'OK',
              {
                duration: 3000,
              }
            );
          },
        });
      }

      case 'DELETE_ALL_ENGINES':
      case 'DELETE_ENGINES_IN_DRIVING': {
        const ids: number[] = [];
        computedEvents?.forEach(
          (e) =>
            e.statusName.includes('Engine') &&
            (action === 'DELETE_ENGINES_IN_DRIVING'
              ? e.occurredDuringDriving
              : true) &&
            ids.push(e.id)
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
