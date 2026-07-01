import { Injectable, inject, signal, effect, computed } from '@angular/core';

import {
  IDailyLogs,
  IDriverDailyLogEvents,
  IEvent,
} from '../interfaces/driver-daily-log-events.interface';
import { UrlService } from './url.service';
import { tap } from 'rxjs';
import { AppService } from './app.service';
import { IEventLocation, IParsedErrorInfo } from '../interfaces/api.interface';
import { TEventTypeCode } from '../types';

import { ITenant } from '../interfaces';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../components/UI/dialog/dialog.component';
import { ApiService } from './api.service';
import { ComputeEventsService } from './compute-events.service';
import { FormInputService } from './form-input.service';
import { TaskQueueService } from './task-queue.service';

@Injectable({ providedIn: 'root' })
export class MonitorService {
  private urlService = inject(UrlService);
  private appService = inject(AppService);
  private apiService = inject(ApiService);
  private computeEventsService = inject(ComputeEventsService);
  private formInputService = inject(FormInputService);
  private taskQueueService = inject(TaskQueueService);

  readonly dialog = inject(MatDialog);

  /** Event ids with a pending or processing monitor operation. Used to disable
   *  the update/resize/fix buttons for only the events being worked on. */
  busyEventIds = computed(
    () =>
      new Set(
        this.taskQueueService.monitor
          .tasks()
          .filter(
            (t) => t.status === 'pending' || t.status === 'processing',
          )
          .flatMap((t) => t.eventIds ?? []),
      ),
  );

  isEventBusy(id: number): boolean {
    return this.busyEventIds().has(id);
  }

  refresh = signal(0);
  refreshBtnDisabled = signal(false);
  disableFixButtons = signal(false);
  showToolMenu = signal(false);

  selectedEvents = signal<IEvent[]>([]);

  /** Distinct calendar days spanned by the current selection — drives the
   *  "N selected across M days" cross-day indicator. */
  selectedDayCount = computed(
    () =>
      new Set(this.selectedEvents().map((e) => e.date.substring(0, 10))).size,
  );

  clearSelectedEvents() {
    this.selectedEvents.set([]);
  }

  duplicateEvent = signal(false);
  isUpdatingEvent = signal(false);
  showUpdateEvent = signal<number | null>(null);
  currentEditEvent = signal<null | IEvent>(null);
  createNewEvent = signal(false);
  newNote = signal('');
  newOdometer = signal(0);
  newEventTypeId = signal(0);

  eventTypes: TEventTypeCode[] = [
    'ChangeToOffDutyStatus',
    'ChangeToSleeperBerthStatus',
    'IntermediateLogConventionalLocationPrecision',
    'ChangeToDrivingStatus',
    'ChangeToOnDutyNotDrivingStatus',
    'EnginePowerUpConventionalLocationPrecision',
    'EngineShutDownConventionalLocationPrecision',
    'AuthenticatedDriverLogin',
    'AuthenticatedDriverLogout',
  ];

  newEventType = computed(() => this.eventTypes[this.newEventTypeId()]);

  isResizingEvent = signal(false);
  showResize = signal<number | null>(null);
  showAdvancedResize = signal<IParsedErrorInfo | null>(null);
  currentResizeDriving = signal<null | IEvent>(null);
  newResizeSpeed = signal(0);
  newResizeDuration = computed(() => {
    const resizeEvent = this.currentResizeDriving();
    const newSpeed = this.newResizeSpeed();
    if (!resizeEvent || !newSpeed) return;
    const originalSpeed = resizeEvent.averageSpeed * 10000; // upscale x 1000
    const originalDuration = resizeEvent.realDurationInSeconds;
    const distance = originalSpeed * (originalDuration / 3600);

    return ((distance / newSpeed) * 3600) / 10000; // downscale x 1000
  });

  isShifting = signal(false);
  isShiftingDialogOpen = signal(false);

  copiedEventLocation = signal<IEventLocation | null>(null);

  updateEvents = effect(() => {
    const url = this.urlService.url();
    const tenant = this.urlService.tenant();
    if (!url || !tenant) return;
    if (this.refresh()) console.log('live monitor page refreshed');

    this.appService.contextMenuVisible.set(false);

    this.updateDriverDailyLogEvents(url, tenant.id);
  });

  driverDailyLog = signal<null | IDriverDailyLogEvents>(null);
  computedDailyLogEvents = signal<null | IEvent[]>(null);

  driverInfo = computed(() => {
    const currentTenant = this.urlService.tenant();
    const ddle = this.driverDailyLog();
    const tenantsLog = this.appService.tenantsLogSignal();
    if (!currentTenant || !ddle || Object.keys(tenantsLog).length === 0)
      return null;

    const driverInfo = tenantsLog[currentTenant.id].items.find(
      (d) => d.id === ddle.driverId,
    );

    return driverInfo;
  });

  engineOccuredDuringDriving = computed(() => {
    const events = this.computedDailyLogEvents();
    if (!events) return false;
    const engineOccuredDuringDriving = events.find((e) => {
      if (e.engineInfo?.length) {
        return e.engineInfo.find((engine) => {
          return (
            e.nextDutyStatusInfo?.totalVehicleMiles !== engine.totalVehicleMiles
          );
        });
      } else return false;
    });

    if (engineOccuredDuringDriving) return true;
    else return false;
  });

  isUpdating = signal(false);

  constructor() {}

  refreshDailyLogs = () => {
    this.refreshBtnDisabled.set(true);
    this.refresh.update((value) => value + 1);

    // NOTE: edit-form signals (currentEditEvent / showUpdateEvent / newNote /
    // newOdometer) and resize-form signals (currentResizeDriving / showResize /
    // newResizeSpeed) are intentionally NOT cleared here. After the refreshed
    // logs land, reconcileEditFormAfterRefresh() / reconcileResizeFormAfterRefresh()
    // keep the form open if the event still exists, otherwise they clear it.
  };

  selectAllEvents() {
    const allEvents = this.computedDailyLogEvents()?.filter(
      (ev) => ev.driver.id === ev.driver.viewId,
    );

    if (!allEvents) return this.selectedEvents.set([]);
    if (
      allEvents.length === this.selectedEvents().length ||
      allEvents.length - this.selectedEvents().length === 1
    )
      return this.selectedEvents.set([]);

    const events = [...allEvents];
    events.shift();
    this.selectedEvents.update((prev) => [...new Set([...prev, ...events])]);
  }

  openShiftDialog() {
    if (this.selectedEvents().length === 0) return;
    return this.dialog.open(DialogComponent);
  }

  updateDriverDailyLogEvents(url: string, tenantId: string): void {
    this.isUpdating.set(true);

    const parts = url.split('/');
    const logs = parts[3];
    const id = +parts[4];
    const timestamp = parts[5];

    if (logs !== 'logs' || id === undefined || timestamp === undefined) {
      this.driverDailyLog.set(null);
      this.refreshBtnDisabled.set(false);
      this.isUpdating.set(false);
      return;
    }

    this.apiService
      .getDriverDailyLogEvents(id, timestamp, tenantId)
      .pipe(
        tap((driverDailyLog) => {
          this.driverDailyLog.set(driverDailyLog);
          // Edit-form and resize-form signals are reconciled in
          // handleDriverDailyLogEvents once the computed events exist, so they
          // survive an in-app refresh.

          if (driverDailyLog.coDrivers && driverDailyLog.coDrivers[0]?.id) {
            const coId = driverDailyLog.coDrivers[0].id;
            this.apiService
              .getDriverDailyLogEvents(coId, timestamp, tenantId)
              .subscribe({
                next: (coDriverDailyLog) =>
                  this.handleDriverDailyLogEvents({
                    driverDailyLog,
                    coDriverDailyLog,
                  }),
              });
          } else
            this.handleDriverDailyLogEvents({
              driverDailyLog,
              coDriverDailyLog: null,
            });
        }),
      )
      .subscribe();

    return;
  }

  handleDriverDailyLogEvents({ driverDailyLog, coDriverDailyLog }: IDailyLogs) {
    this.isUpdating.set(false);
    this.refreshBtnDisabled.set(false);

    if (!driverDailyLog) {
      console.log('No driver daily log found', driverDailyLog);
      return this.computedDailyLogEvents.set(null);
    } else {
      const tenant = this.urlService.tenant() as ITenant;
      this.computedDailyLogEvents.set(
        this.computeEventsService.getComputedEvents(
          {
            driverDailyLog,
            coDriverDailyLog,
          },
          tenant,
        ),
      );
      this.reconcileEditFormAfterRefresh();
      this.reconcileResizeFormAfterRefresh();
      return;
    }
  }

  /**
   * After the daily logs are refetched, keep the resize form open only if the
   * driving event being resized still exists in the fresh logs. Matches on both
   * `id` and `startTime` to avoid a false positive when a different driver
   * reuses an id. The user's chosen speed (newResizeSpeed) is preserved; the
   * advanced-resize prompt is cleared when the event is gone.
   */
  private reconcileResizeFormAfterRefresh() {
    const resizeEvent = this.currentResizeDriving();
    if (!resizeEvent) return;

    const match = this.computedDailyLogEvents()?.find(
      (e) =>
        e.id !== 0 &&
        e.id === resizeEvent.id &&
        e.startTime === resizeEvent.startTime,
    );

    if (match) {
      // Refresh the reference to the new event object; keep the user's chosen
      // newResizeSpeed and any advanced-resize prompt.
      this.currentResizeDriving.set(match);
      this.showResize.set(match.id);
    } else {
      this.currentResizeDriving.set(null);
      this.showResize.set(null);
      this.newResizeSpeed.set(0);
      this.showAdvancedResize.set(null);
    }
  }

  /**
   * After the daily logs are refetched (e.g. the in-app Refresh button), keep
   * the edit form open only if the event being edited still exists in the fresh
   * logs. Matches on both `id` and `startTime` to avoid a false positive when a
   * different driver happens to reuse an id. Duplicated events (local-only,
   * id 0) are never persisted across a refresh.
   */
  private reconcileEditFormAfterRefresh() {
    const editEvent = this.currentEditEvent();
    if (!editEvent) return;

    const match = this.duplicateEvent()
      ? undefined
      : this.computedDailyLogEvents()?.find(
          (e) =>
            e.id !== 0 &&
            e.id === editEvent.id &&
            e.startTime === editEvent.startTime,
        );

    if (match) {
      // Refresh the reference to the new event object; keep the user's in-progress
      // edits (newNote / newOdometer / newEventTypeId).
      this.currentEditEvent.set(match);
      this.showUpdateEvent.set(match.id);
    } else {
      this.currentEditEvent.set(null);
      this.showUpdateEvent.set(null);
      this.duplicateEvent.set(false);
      this.newNote.set('');
      this.newOdometer.set(0);
    }
  }

  createDuplicatedEvent(event: IEvent) {
    this.computedDailyLogEvents.update((events) =>
      events ? events.filter((ev) => ev.id !== 0) : [],
    );
    this.duplicateEvent.set(true);
    this.selectedEvents.set([]);
    this.currentResizeDriving.set(null);
    this.showResize.set(null);
    this.newResizeSpeed.set(0);

    this.formInputService.geolocation.set(null);
    this.formInputService.latitude.set('');
    this.formInputService.longitude.set('');

    const tempEvent = { ...event };
    event.id = 0;

    this.computedDailyLogEvents.update((prev) => {
      const newEvents = [...(prev as IEvent[])];
      newEvents.splice(event.computeIndex + 1, 0, tempEvent);
      return [...newEvents];
    });

    this.newEventTypeId.set(
      this.eventTypes.findIndex((t) => t === tempEvent.dutyStatus),
    );
    this.newNote.set('');
    if (
      [
        'ChangeToOffDutyStatus',
        'ChangeToSleeperBerthStatus',
        'ChangeToOnDutyNotDrivingStatus',
      ].includes(tempEvent.dutyStatus)
    ) {
      this.newNote.set(tempEvent.notes);
    }

    this.newOdometer.set(tempEvent.odometer);

    this.currentEditEvent.set(tempEvent);
    this.showUpdateEvent.set(tempEvent.id);
  }

  showResizeForm(event: IEvent) {
    if (event.dutyStatus === 'ChangeToDrivingStatus') {
      this.selectedEvents.set([]);

      this.currentEditEvent.set(null);
      this.showUpdateEvent.set(null);
      this.newNote.set('');
      this.newOdometer.set(0);

      this.currentResizeDriving.set(event);
      this.showResize.set(event.id);
      this.newResizeSpeed.set(event.averageSpeed);
      // Opening a resize form always starts in plain (non-advanced) mode.
      this.showAdvancedResize.set(null);
    }
  }

  cancelEventEdit() {
    this.currentEditEvent.set(null);
    this.showUpdateEvent.set(null);
    this.newNote.set('');

    setTimeout(() => this.selectedEvents.set([]), 0);

    this.computedDailyLogEvents.update((events) =>
      events ? events.filter((ev) => ev.id !== 0) : [],
    );
  }
}
