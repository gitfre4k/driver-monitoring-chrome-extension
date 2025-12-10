import { inject, Injectable } from '@angular/core';
import { ApiOperationsService } from './api-operations.service';
import { AppService } from './app.service';
import { MonitorService } from './monitor.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TContextMenuAction } from '../types';
import {
  IDriverFmcsaInspection,
  IEvent,
} from '../interfaces/driver-daily-log-events.interface';
import { UrlService } from './url.service';
import { IEventDetails } from '../interfaces';
import {
  IAdvancedResizePayload,
  IParsedErrorInfo,
  IResizePayload,
  IShiftInputState,
} from '../interfaces/api.interface';
import { parseErrorMessage } from '../helpers/context-menu.helpers';
import { from, mergeMap, switchMap } from 'rxjs';
import { ConstantsService } from './constants.service';
import { BackendService } from './backend.service';

@Injectable({ providedIn: 'root' })
export class ContextMenuService {
  apiOperationsService = inject(ApiOperationsService);
  appService = inject(AppService);
  monitorService = inject(MonitorService);
  urlService = inject(UrlService);
  constantsService = inject(ConstantsService);
  backendService = inject(BackendService);
  _snackBar = inject(MatSnackBar);

  computedEvents = this.monitorService.computedDailyLogEvents;

  handleAction(
    action: TContextMenuAction,
    event?: IEvent,
    payload?:
      | Partial<IEventDetails>
      | IResizePayload
      | IParsedErrorInfo
      | IAdvancedResizePayload
      | IDriverFmcsaInspection
      | undefined,
  ) {
    const tenant = this.appService.currentTenant();
    const computedEvents = this.computedEvents();

    if (!tenant) return;

    this._snackBar.open(
      `[ContextMenuService] executing action: ${action}`,
      'OK',
      { duration: 2000 },
    );

    switch (action) {
      case 'ChangeToSleeperBerthStatus':
      case 'ChangeToOffDutyStatus':
      case 'ChangeToDrivingStatus':
      case 'ChangeToOnDutyNotDrivingStatus': {
        if (!event) return;

        return this.apiOperationsService
          .updateEventTypeCode(tenant, event.id, action)
          .subscribe({
            error: (err) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this._snackBar.open(`[ERROR]: ${err.error.message}`, 'OK', {
                duration: 7000,
              });
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this._snackBar.open('Event type successfully updated.', 'OK', {
                duration: 3000,
              });
            },
          });
      }
      case 'EXTEND_PTI': {
        if (!event) return;
        this.monitorService.disableFixButtons.set(true);
        return this.apiOperationsService
          .extendPTI(tenant, event.id, event.pti)
          .subscribe({
            error: (err) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.disableFixButtons.set(false);
              this._snackBar.open(`[ERROR]: ${err.error.message}`, 'OK', {
                duration: 7000,
              });
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              setTimeout(
                () => this.monitorService.disableFixButtons.set(false),
                2000,
              );
              this._snackBar.open(
                'Pre-Trip Inspection is now extended.',
                'OK',
                { duration: 3000 },
              );
            },
          });
      }
      case 'ADD_PTI_NOTE': {
        if (!event) return;
        this.handleAction('UPDATE_EVENT', event, {
          note: this.constantsService.ptiName(),
        });
        return;
      }
      case 'ADD_PTI':
      case 'ADD_ENGINE_OFF': {
        if (!event) return;
        action === 'ADD_PTI' && this.monitorService.disableFixButtons.set(true);
        return this.apiOperationsService[
          action === 'ADD_PTI' ? 'addPTI' : 'addEngineOff'
        ](tenant, event.id).subscribe({
          error: (err) => {
            this.urlService.refreshWebApp();
            this.monitorService.refresh.update((value) => value + 1);
            action === 'ADD_PTI' &&
              this.monitorService.disableFixButtons.set(false);
            this._snackBar.open(`[ERROR]: ${err.error.message}`, 'OK', {
              duration: 7000,
            });
          },
          complete: () => {
            this.urlService.refreshWebApp();
            this.monitorService.refresh.update((value) => value + 1);
            action === 'ADD_PTI' &&
              setTimeout(
                () => this.monitorService.disableFixButtons.set(false),
                2000,
              );
            this._snackBar.open(
              `${
                action === 'ADD_PTI' ? 'Pre-Trip Inspection' : 'Engine Off'
              } has been added.`,
              'OK',
              { duration: 3000 },
            );
          },
        });
      }
      case 'DELETE_ALL_ENGINES':
      case 'DELETE_ENGINES_IN_DRIVING': {
        const ids: number[] = [];
        computedEvents?.forEach((e) => {
          if (action !== 'DELETE_ENGINES_IN_DRIVING') {
            e.statusName.includes('Engine') && ids.push(e.id);
          } else {
            if (e.engineInfo?.length) {
              e.engineInfo.forEach((engine) => {
                e.nextDutyStatusInfo?.totalVehicleMiles !==
                  engine.totalVehicleMiles && ids.push(engine.id);
              });
            }
          }
        });

        if (!ids.length)
          return this._snackBar.open('No engine status detected.', 'OK', {
            duration: 3000,
          });

        return this.apiOperationsService.deleteEvents(tenant, ids).subscribe({
          error: (err) => {
            this.urlService.refreshWebApp();
            this.monitorService.refresh.update((value) => value + 1);
            this._snackBar.open(`[ERROR]: ${err.error.message}`, 'OK', {
              duration: 3000,
            });
          },
          complete: () => {
            this.urlService.refreshWebApp();
            this.monitorService.refresh.update((value) => value + 1);
            this._snackBar.open(
              `${ids.length} engine event${
                ids.length > 1 ? 's' : ''
              } have been deleted.`,
              'OK',
              { duration: 3000 },
            );
          },
        });
      }

      case 'POST_FMCSA': {
        if (!event || !payload) return;
        this.monitorService.isUpdatingEvent.set(true);
        this.monitorService.disableFixButtons.set(true);

        const driver = {
          driverId: event.driver.id,
          driverFullName: event.driver.name,
        };
        const fmcsaData = payload as IDriverFmcsaInspection;

        return this.backendService
          .uploadData(
            event.tenant,
            driver,
            JSON.stringify(fmcsaData),
            'ChangeToOnDutyNotDrivingStatus',
            null,
          )
          .subscribe({
            error: (err) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.isUpdatingEvent.set(false);
              this.monitorService.showUpdateEvent.set(null);
              this.monitorService.disableFixButtons.set(false);
              this._snackBar.open(`[ERROR]: ${err.error.message}`, 'OK', {
                duration: 7000,
              });
            },
            complete: () => {
              this.backendService.loadShiftReport();
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              setTimeout(
                () => this.monitorService.isUpdatingEvent.set(false),
                2000,
              );
              this.monitorService.showUpdateEvent.set(null);
              this.monitorService.disableFixButtons.set(false);
              this._snackBar.open(
                'FMCSA Inspection successfully posted',
                'OK',
                {
                  duration: 3000,
                },
              );
            },
          });
      }

      case 'UPDATE_EVENT': {
        if (!event || !payload) return;
        this.monitorService.isUpdatingEvent.set(true);
        this.monitorService.disableFixButtons.set(true);
        return this.apiOperationsService
          .updateEvent(tenant, event.id, payload as Partial<IEventDetails>)
          .subscribe({
            error: (err) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.isUpdatingEvent.set(false);
              this.monitorService.showUpdateEvent.set(null);
              this.monitorService.disableFixButtons.set(false);
              this._snackBar.open(`[ERROR]: ${err.error.message}`, 'OK', {
                duration: 7000,
              });
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              setTimeout(
                () => this.monitorService.isUpdatingEvent.set(false),
                2000,
              );
              this.monitorService.showUpdateEvent.set(null);
              this.monitorService.disableFixButtons.set(false);
              this._snackBar.open('Status successfully updated', 'OK', {
                duration: 3000,
              });
            },
          });
      }
      case 'RESIZE': {
        if (!event || !payload) return;
        this.monitorService.isResizingEvent.set(true);
        return this.apiOperationsService
          .resizeEvent(tenant, event.id, payload as IResizePayload)
          .subscribe({
            error: (err) => {
              this._snackBar.open(`[ERROR]: ${err.error.message}`, 'OK', {
                duration: 7000,
              });

              // go to [ADVANCED RESIZE]
              if (err.error.code === 'ResizeEvents.DifferenceInMiles') {
                const parsedErrorInfo = parseErrorMessage(err.error.message);
                if (parsedErrorInfo) {
                  this.monitorService.showAdvancedResize.set(parsedErrorInfo);
                  this.monitorService.isResizingEvent.set(false);
                }
              } else {
                this.urlService.refreshWebApp();
                this.monitorService.refresh.update((value) => value + 1);
                this.monitorService.isResizingEvent.set(false);
                this.monitorService.showResize.set(null);
                this.monitorService.currentResizeDriving.set(null);
                this._snackBar.open(`${err.error.message}`, 'OK', {
                  duration: 7000,
                });
              }
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.currentResizeDriving.set(null);
              this.monitorService.refresh.update((value) => value + 1);
              setTimeout(
                () => this.monitorService.isResizingEvent.set(false),
                2000,
              );
              this.monitorService.showResize.set(null);
              this._snackBar.open('Driving successfully resized', 'OK', {
                duration: 3000,
              });
            },
          });
      }
      case 'ADVANCED_RESIZE': {
        if (!event || !payload) return;
        this.monitorService.isResizingEvent.set(true);
        return this.apiOperationsService
          .advancedResize(tenant, event, payload as IAdvancedResizePayload)
          .subscribe({
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.isResizingEvent.set(false);
              this.monitorService.showResize.set(null);
              this.monitorService.showAdvancedResize.set(null);
              this._snackBar.open(`[ERROR]: ${err.error.message}`, 'OK', {
                duration: 7000,
              });
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.showResize.set(null);
              this.monitorService.showAdvancedResize.set(null);
              setTimeout(
                () => this.monitorService.isResizingEvent.set(false),
                2000,
              );
              this._snackBar.open('Event successfully resized', 'OK', {
                duration: 3000,
              });
            },
          });
      }
      case 'PARTIAL_ON_TO_SLEEP':
      case 'PARTIAL_ON_TO_OFF': {
        if (!event) return;

        const typeCode =
          action === 'PARTIAL_ON_TO_SLEEP'
            ? 'ChangeToSleeperBerthStatus'
            : 'ChangeToOffDutyStatus';

        return this.apiOperationsService
          .partiallyTransformOnDuty(tenant, event, typeCode)
          .subscribe({
            error: (err) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this._snackBar.open(`[ERROR]: ${err.error.message}`, 'OK', {
                duration: 7000,
              });
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this._snackBar.open(
                `On Duty event partially transformed into ${
                  action === 'PARTIAL_ON_TO_SLEEP'
                    ? 'Sleeper Berth'
                    : 'Off Duty'
                }`,
                'OK',
                { duration: 3000 },
              );
            },
          });
      }

      case 'DUPLICATE': {
        if (!event) return;
        return this.apiOperationsService
          .duplicateEvent(tenant, event, payload as Partial<IEventDetails>)
          .subscribe({
            error: (err) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this._snackBar.open(`[ERROR]: ${err.error.message}`, 'OK', {
                duration: 7000,
              });
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this._snackBar.open(
                `operation Duplicate Event successful`,
                'OK',
                { duration: 3000 },
              );
            },
          });
      }

      case 'PARTIAL_TO_ON': {
        if (!event) return;

        const typeCode = 'ChangeToOnDutyNotDrivingStatus';

        return this.apiOperationsService
          .partiallyTransformOnDuty(tenant, event, typeCode)
          .subscribe({
            error: (err) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this._snackBar.open(`[ERROR]: ${err.error.message}`, 'OK', {
                duration: 7000,
              });
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this._snackBar.open(
                `Event partial transformation successful`,
                'OK',
                { duration: 3000 },
              );
            },
          });
      }

      case 'COPY_LOCATION': {
        if (!event) return;
        return this.apiOperationsService.getEvent(tenant, event.id).subscribe({
          next: (eventDetails) => {
            const { geolocation, latitude, longitude, locationSource } =
              eventDetails;
            this.monitorService.copiedEventLocation.set({
              geolocation,
              latitude,
              longitude,
              locationSource,
            });
            this._snackBar.open(`Copied: ${geolocation}`, 'OK', {
              duration: 1500,
            });
          },
          error: (err) => {
            this.urlService.refreshWebApp();
            this.monitorService.refresh.update((value) => value + 1);
            this._snackBar.open(`[ERROR]: ${err.error.message}`, 'OK', {
              duration: 7000,
            });
          },
        });
      }

      default:
        return;
    }
  }

  handleMultiEventAction(
    action: TContextMenuAction,
    events: IEvent[],
    payload?: IShiftInputState,
  ) {
    const tenant = this.appService.currentTenant();
    // const computedEvents = this.computedEvents();

    if (!tenant) return;
    switch (action) {
      case 'SHIFT_EVENTS': {
        if (!payload) return;

        this.monitorService.isShifting.set(true);
        return this.apiOperationsService
          .shift(tenant, events, payload)
          .subscribe({
            error: (err) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.isShifting.set(false);
              this._snackBar.open(
                `[ERROR]: ${err.error.message ?? err.title}`,
                'OK',
                { duration: 7000 },
              );
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.isShifting.set(false);
              this.monitorService.selectedEvents.set([]);
              payload.dialogRef && payload.dialogRef.close();
              this._snackBar.open('Shift operation successful.', 'OK', {
                duration: 3000,
              });
            },
          });
      }
      case 'DELETE_SELECTED_EVENTS': {
        const ids = events.map((ev) => ev.id);

        return this.apiOperationsService.deleteEvents(tenant, ids).subscribe({
          error: (err) => {
            this.urlService.refreshWebApp();
            this.monitorService.refresh.update((value) => value + 1);
            this.monitorService.selectedEvents.set([]);
            this._snackBar.open(`[ERROR]: ${err.error.message}`, 'OK', {
              duration: 3000,
            });
          },
          complete: () => {
            this.urlService.refreshWebApp();
            this.monitorService.refresh.update((value) => value + 1);
            this.monitorService.selectedEvents.set([]);
            this._snackBar.open(
              `${ids.length} event${
                ids.length > 1 ? 's' : ''
              } successfully deleted.`,
              'OK',
              { duration: 3000 },
            );
          },
        });
      }

      case 'PASTE_LOCATION': {
        const updatePayload = this.monitorService.copiedEventLocation();
        if (!updatePayload) return;

        return from(events)
          .pipe(
            mergeMap((event) =>
              this.apiOperationsService.updateEvent(
                tenant,
                event.id,
                updatePayload,
              ),
            ),
          )
          .subscribe({
            error: (err) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this._snackBar.open(`[ERROR]: ${err.error.message}`, 'OK', {
                duration: 7000,
              });
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.selectedEvents.set([]);
              this.monitorService.copiedEventLocation.set(null);
              this._snackBar.open(
                `Location successfully pasted on ${events.length} event${events.length > 1 ? 's' : ''}.`,
                'OK',
                { duration: 3000 },
              );
            },
          });
      }
      default:
        return;
    }
  }
}
