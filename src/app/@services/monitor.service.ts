import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { ApiService } from './api.service';

import {
  IDailyLogs,
  IDriverDailyLogEvents,
  IEvent,
} from '../interfaces/driver-daily-log-events.interface';
import { UrlService } from './url.service';
import { ComputeEventsService } from './compute-events.service';
import { tap } from 'rxjs';
import { AppService } from './app.service';
import { IParsedErrorInfo } from '../interfaces/api.interface';
import { TEventTypeCode } from '../types';
import { DateTime } from 'luxon';

@Injectable({ providedIn: 'root' })
export class MonitorService {
  private apiService = inject(ApiService);
  private urlService = inject(UrlService);
  private computeEventsService = inject(ComputeEventsService);
  private appService = inject(AppService);

  refresh = signal(0);
  refreshBtnDisabled = signal(false);
  extendPTIBtnDisabled = signal(false);
  addPTIBtnDisabled = signal(false);
  showToolMenu = signal(false);

  selectedEvents = signal<IEvent[]>([]);

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
    'ChangeToDrivingStatus',
    'ChangeToOnDutyNotDrivingStatus',
    'IntermediateLogConventionalLocationPrecision',
    'EnginePowerUpConventionalLocationPrecision',
    'EngineShutDownConventionalLocationPrecision',
  ];
  newEventType = computed(() => this.eventTypes[this.newEventTypeId()]);

  isResizingEvent = signal(false);
  showResize = signal<number | null>(null);
  showAdvancedResize = signal<IParsedErrorInfo | null>(null);
  currentResizeDriving = signal<null | IEvent>(null);
  newResizeSpeed = signal(0);

  isShifting = signal(false);

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

  isUpdating = signal(false);

  constructor() {}

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

          this.currentEditEvent.set(null);
          this.showUpdateEvent.set(null);
          this.newNote.set('');
          this.currentResizeDriving.set(null);
          this.showResize.set(null);
          this.newResizeSpeed.set(0);

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
    } else
      return this.computedDailyLogEvents.set(
        this.computeEventsService.getComputedEvents({
          driverDailyLog,
          coDriverDailyLog,
        }),
      );
  }

  createDuplicatedEvent(event: IEvent) {
    this.duplicateEvent.set(true);
    this.selectedEvents.set([]);
    this.currentResizeDriving.set(null);
    this.showResize.set(null);
    this.newResizeSpeed.set(0);

    const tempEvent = { ...event };

    this.computedDailyLogEvents.update((prev) => {
      const newEvents = [...(prev as IEvent[])];
      newEvents.splice(event.computeIndex, 1, tempEvent);

      return [...newEvents];
    });

    this.newEventTypeId.set(
      this.eventTypes.findIndex((type) => type === tempEvent.dutyStatus),
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
    }
  }
}
