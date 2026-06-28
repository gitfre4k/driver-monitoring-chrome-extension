import { inject, Injectable } from '@angular/core';
import { ApiOperationsService } from './api-operations.service';
import { AppService } from './app.service';
import { MonitorService } from './monitor.service';
import { NotificationService } from './notification.service';
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
import { TaskQueueService } from './task-queue.service';

@Injectable({ providedIn: 'root' })
export class ContextMenuService {
  apiOperationsService = inject(ApiOperationsService);
  appService = inject(AppService);
  monitorService = inject(MonitorService);
  urlService = inject(UrlService);
  constantsService = inject(ConstantsService);
  backendService = inject(BackendService);
  taskQueueService = inject(TaskQueueService);
  notification = inject(NotificationService);

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

    this.notification.info(`[ContextMenuService] executing action: ${action}`, {
      duration: 2000,
    });

    switch (action) {
      case 'ChangeToSleeperBerthStatus':
      case 'ChangeToOffDutyStatus':
      case 'ChangeToDrivingStatus':
      case 'ChangeToOnDutyNotDrivingStatus': {
        if (!event) return;

        return this.taskQueueService.monitor.enqueue(
          'Change Status',
          () =>
            this.apiOperationsService.updateEventTypeCode(
              tenant,
              event.id,
              action,
            ),
          {
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.notification.error(`[ERROR]: ${err.error.message}`);
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.notification.success('Event type successfully updated.');
            },
          },
        );
      }
      case 'EXTEND_PTI': {
        if (!event) return;
        this.monitorService.disableFixButtons.set(true);
        return this.taskQueueService.monitor.enqueue(
          'Extend PTI',
          () => this.apiOperationsService.extendPTI(tenant, event.id, event.pti),
          {
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.disableFixButtons.set(false);
              this.notification.error(`[ERROR]: ${err.error.message}`);
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              setTimeout(
                () => this.monitorService.disableFixButtons.set(false),
                2000,
              );
              this.notification.success('Pre-Trip Inspection is now extended.');
            },
          },
        );
      }
      case 'EXTEND_PTI_AND_NOTE': {
        if (!event) return;
        this.monitorService.disableFixButtons.set(true);
        return this.taskQueueService.monitor.enqueue(
          'Extend PTI + Note',
          () =>
            this.apiOperationsService
              .extendPTI(tenant, event.id, event.pti)
              .pipe(
                switchMap(() =>
                  this.apiOperationsService.updateEvent(tenant, event.id, {
                    note: this.constantsService.ptiName(),
                  }),
                ),
              ),
          {
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.disableFixButtons.set(false);
              this.notification.error(`[ERROR]: ${err.error.message}`);
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              setTimeout(
                () => this.monitorService.disableFixButtons.set(false),
                2000,
              );
              this.notification.success(
                'Pre-Trip Inspection extended and note added.',
              );
            },
          },
        );
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
        return this.taskQueueService.monitor.enqueue(
          action === 'ADD_PTI' ? 'Add PTI' : 'Add Engine Off',
          () =>
            this.apiOperationsService[
              action === 'ADD_PTI' ? 'addPTI' : 'addEngineOff'
            ](tenant, event.id),
          {
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              action === 'ADD_PTI' &&
                this.monitorService.disableFixButtons.set(false);
              this.notification.error(`[ERROR]: ${err.error.message}`);
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              action === 'ADD_PTI' &&
                setTimeout(
                  () => this.monitorService.disableFixButtons.set(false),
                  2000,
                );
              this.notification.success(
                `${
                  action === 'ADD_PTI' ? 'Pre-Trip Inspection' : 'Engine Off'
                } has been added.`,
              );
            },
          },
        );
      }
      case 'DELETE_ALL_ENGINES':
      case 'DELETE_ENGINES_IN_DRIVING': {
        const ids: number[] = [];
        computedEvents?.forEach((e) => {
          if (action !== 'DELETE_ENGINES_IN_DRIVING') {
            e.statusName.includes('Engine') && !e.isLocked && ids.push(e.id);
          } else {
            if (e.engineInfo?.length) {
              e.engineInfo.forEach((engine) => {
                e.nextDutyStatusInfo?.totalVehicleMiles !==
                  engine.totalVehicleMiles &&
                  !e.isLocked &&
                  ids.push(engine.id);
              });
            }
          }
        });

        if (!ids.length)
          return this.notification.warning('No engine status detected.');

        // milena
        return this.taskQueueService.monitor.enqueue(
          'Delete Engines',
          () => this.apiOperationsService.deleteEvents(tenant, ids),
          {
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.notification.error(`[ERROR]: ${err.error.message}`, {
                duration: 3000,
              });
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.notification.success(
                `${ids.length} engine event${
                  ids.length > 1 ? 's' : ''
                } have been deleted.`,
              );
            },
          },
        );
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

        return this.taskQueueService.monitor.enqueue(
          'Post FMCSA',
          () =>
            this.backendService.uploadData(
              event.tenant,
              driver,
              JSON.stringify(fmcsaData),
              'ChangeToOnDutyNotDrivingStatus',
              null,
            ),
          {
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.isUpdatingEvent.set(false);
              this.monitorService.showUpdateEvent.set(null);
              this.monitorService.disableFixButtons.set(false);
              this.notification.error(`[ERROR]: ${err.error.message}`);
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
              this.notification.success('FMCSA Inspection successfully posted');
            },
          },
        );
      }

      case 'UPDATE_EVENT': {
        if (!event || !payload) return;
        this.monitorService.isUpdatingEvent.set(true);
        this.monitorService.disableFixButtons.set(true);
        return this.taskQueueService.monitor.enqueue(
          'Update Event',
          () =>
            this.apiOperationsService.updateEvent(
              tenant,
              event.id,
              payload as Partial<IEventDetails>,
            ),
          {
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.isUpdatingEvent.set(false);
              this.monitorService.showUpdateEvent.set(null);
              this.monitorService.disableFixButtons.set(false);
              this.notification.error(`[ERROR]: ${err.error.message}`);
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
              this.notification.success('Status successfully updated');
            },
          },
        );
      }
      case 'RESIZE': {
        if (!event || !payload) return;
        this.monitorService.isResizingEvent.set(true);
        return this.taskQueueService.monitor.enqueue(
          'Resize',
          () =>
            this.apiOperationsService.resizeEvent(
              tenant,
              event.id,
              payload as IResizePayload,
            ),
          {
            error: (err: any) => {
              this.notification.error(`[ERROR]: ${err.error.message}`);

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
                this.notification.error(`${err.error.message}`);
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
              this.notification.success('Driving successfully resized');
            },
          },
        );
      }
      case 'ADVANCED_RESIZE': {
        if (!event || !payload) return;
        this.monitorService.isResizingEvent.set(true);
        return this.taskQueueService.monitor.enqueue(
          'Advanced Resize',
          () =>
            this.apiOperationsService.advancedResize(
              tenant,
              event,
              payload as IAdvancedResizePayload,
            ),
          {
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.isResizingEvent.set(false);
              this.monitorService.showResize.set(null);
              this.monitorService.showAdvancedResize.set(null);
              this.notification.error(`[ERROR]: ${err.error.message}`);
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
              this.notification.success('Event successfully resized');
            },
          },
        );
      }
      case 'PARTIAL_ON_TO_SLEEP':
      case 'PARTIAL_ON_TO_OFF': {
        if (!event) return;

        const typeCode =
          action === 'PARTIAL_ON_TO_SLEEP'
            ? 'ChangeToSleeperBerthStatus'
            : 'ChangeToOffDutyStatus';

        return this.taskQueueService.monitor.enqueue(
          'Partial Transform',
          () =>
            this.apiOperationsService.partiallyTransformOnDuty(
              tenant,
              event,
              typeCode,
            ),
          {
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.notification.error(`[ERROR]: ${err.error.message}`);
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.notification.success(
                `On Duty event partially transformed into ${
                  action === 'PARTIAL_ON_TO_SLEEP'
                    ? 'Sleeper Berth'
                    : 'Off Duty'
                }`,
              );
            },
          },
        );
      }

      case 'DUPLICATE': {
        if (!event) return;
        return this.taskQueueService.monitor.enqueue(
          'Duplicate Event',
          () =>
            this.apiOperationsService.duplicateEvent(
              tenant,
              event,
              payload as Partial<IEventDetails>,
            ),
          {
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.notification.error(`[ERROR]: ${err.error.message}`);
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.notification.success(`operation Duplicate Event successful`);
            },
          },
        );
      }

      case 'PARTIAL_TO_ON': {
        if (!event) return;

        const typeCode = 'ChangeToOnDutyNotDrivingStatus';

        return this.taskQueueService.monitor.enqueue(
          'Partial Transform',
          () =>
            this.apiOperationsService.partiallyTransformOnDuty(
              tenant,
              event,
              typeCode,
            ),
          {
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.notification.error(`[ERROR]: ${err.error.message}`);
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.notification.success(
                `Event partial transformation successful`,
              );
            },
          },
        );
      }

      case 'COPY_LOCATION': {
        if (!event) return;
        return this.taskQueueService.monitor.enqueue(
          'Copy Location',
          () => this.apiOperationsService.getEvent(tenant, event.id),
          {
            next: (eventDetails: any) => {
              const { geolocation, latitude, longitude, locationSource } =
                eventDetails;
              this.monitorService.copiedEventLocation.set({
                geolocation,
                latitude,
                longitude,
                locationSource,
              });
              this.notification.info(`Copied: ${geolocation}`, {
                duration: 1500,
              });
            },
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.notification.error(`[ERROR]: ${err.error.message}`);
            },
          },
        );
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
        return this.taskQueueService.monitor.enqueue(
          'Shift',
          () => this.apiOperationsService.shift(tenant, events, payload),
          {
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.isShifting.set(false);
              this.notification.error(
                `[ERROR]: ${err.error.message ?? err.title}`,
              );
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.isShifting.set(false);
              this.monitorService.selectedEvents.set([]);
              payload.dialogRef && payload.dialogRef.close();
              this.notification.success('Shift operation successful.');
            },
          },
        );
      }
      case 'DELETE_SELECTED_EVENTS': {
        const ids = events.map((ev) => ev.id);

        return this.taskQueueService.monitor.enqueue(
          'Delete Events',
          () => this.apiOperationsService.deleteEvents(tenant, ids),
          {
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.selectedEvents.set([]);
              this.notification.error(`[ERROR]: ${err.error.message}`, {
                duration: 3000,
              });
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.selectedEvents.set([]);
              this.notification.success(
                `${ids.length} event${
                  ids.length > 1 ? 's' : ''
                } successfully deleted.`,
              );
            },
          },
        );
      }

      case 'PASTE_LOCATION': {
        const updatePayload = this.monitorService.copiedEventLocation();
        if (!updatePayload) return;

        return this.taskQueueService.monitor.enqueue(
          'Paste Location',
          () =>
            from(events).pipe(
              mergeMap((event) =>
                this.apiOperationsService.updateEvent(
                  tenant,
                  event.id,
                  updatePayload,
                ),
              ),
            ),
          {
            error: (err: any) => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.notification.error(`[ERROR]: ${err.error.message}`);
            },
            complete: () => {
              this.urlService.refreshWebApp();
              this.monitorService.refresh.update((value) => value + 1);
              this.monitorService.selectedEvents.set([]);
              this.monitorService.copiedEventLocation.set(null);
              this.notification.success(
                `Location successfully pasted on ${events.length} event${events.length > 1 ? 's' : ''}.`,
              );
            },
          },
        );
      }
      default:
        return;
    }
  }
}
