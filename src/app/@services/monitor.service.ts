import { Injectable, inject, signal, effect, computed } from "@angular/core";

import {
  IDailyLogs,
  IDriverDailyLogEvents,
  IEvent,
} from "../interfaces/driver-daily-log-events.interface";
import { UrlService } from "./url.service";
import { tap } from "rxjs";
import { AppService } from "./app.service";
import { IEventLocation, IParsedErrorInfo } from "../interfaces/api.interface";
import { TEventTypeCode } from "../types";

import { ITenant } from "../interfaces";
import { MatDialog } from "@angular/material/dialog";
import { DialogComponent } from "../components/UI/dialog/dialog.component";
import { ApiService } from "./api.service";
import { ComputeEventsService } from "./compute-events.service";
import { FormInputService } from "./form-input.service";

@Injectable({ providedIn: "root" })
export class MonitorService {
  private urlService = inject(UrlService);
  private appService = inject(AppService);
  private apiService = inject(ApiService);
  private computeEventsService = inject(ComputeEventsService);
  private formInputService = inject(FormInputService);

  readonly dialog = inject(MatDialog);

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
  newNote = signal("");
  newOdometer = signal(0);
  newEventTypeId = signal(0);
  eventTypes: TEventTypeCode[] = [
    "ChangeToOffDutyStatus",
    "ChangeToSleeperBerthStatus",
    "ChangeToDrivingStatus",
    "ChangeToOnDutyNotDrivingStatus",
    "IntermediateLogConventionalLocationPrecision",
    "EnginePowerUpConventionalLocationPrecision",
    "EngineShutDownConventionalLocationPrecision",
  ];
  newEventType = computed(() => this.eventTypes[this.newEventTypeId()]);

  isResizingEvent = signal(false);
  showResize = signal<number | null>(null);
  showAdvancedResize = signal<IParsedErrorInfo | null>(null);
  currentResizeDriving = signal<null | IEvent>(null);
  newResizeSpeed = signal(0);

  isShifting = signal(false);
  isShiftingDialogOpen = signal(false);

  copiedEventLocation = signal<IEventLocation | null>(null);

  updateEvents = effect(() => {
    const url = this.urlService.url();
    const tenant = this.urlService.tenant();
    if (!url || !tenant) return;
    if (this.refresh()) console.log("live monitor page refreshed");

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

  // getPrevDutyStatus(event: IEvent) {
  //   this.computedEvents();
  // }

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

    const parts = url.split("/");
    const logs = parts[3];
    const id = +parts[4];
    const timestamp = parts[5];

    if (logs !== "logs" || id === undefined || timestamp === undefined) {
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
          this.newNote.set("");
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
      console.log("No driver daily log found", driverDailyLog);
      return this.computedDailyLogEvents.set(null);
    } else {
      const tenant = this.urlService.tenant() as ITenant;
      return this.computedDailyLogEvents.set(
        this.computeEventsService.getComputedEvents(
          {
            driverDailyLog,
            coDriverDailyLog,
          },
          tenant,
        ),
      );
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
    this.formInputService.latitude.set("");
    this.formInputService.longitude.set("");

    const tempEvent = { ...event };
    event.id = 0;

    this.computedDailyLogEvents.update((prev) => {
      const newEvents = [...(prev as IEvent[])];
      newEvents.splice(event.computeIndex + 1, 0, tempEvent);
      return [...newEvents];
    });

    this.newEventTypeId.set(
      this.eventTypes.findIndex((type) => type === tempEvent.dutyStatus),
    );
    this.newNote.set("");
    if (
      [
        "ChangeToOffDutyStatus",
        "ChangeToSleeperBerthStatus",
        "ChangeToOnDutyNotDrivingStatus",
      ].includes(tempEvent.dutyStatus)
    ) {
      this.newNote.set(tempEvent.notes);
    }

    this.newOdometer.set(tempEvent.odometer);

    this.currentEditEvent.set(tempEvent);
    this.showUpdateEvent.set(tempEvent.id);
  }

  showResizeForm(event: IEvent) {
    if (event.dutyStatus === "ChangeToDrivingStatus") {
      this.selectedEvents.set([]);

      this.currentEditEvent.set(null);
      this.showUpdateEvent.set(null);
      this.newNote.set("");
      this.newOdometer.set(0);

      this.currentResizeDriving.set(event);
      this.showResize.set(event.id);
      this.newResizeSpeed.set(event.averageSpeed);
    }
  }
}
