import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { CdkMenuModule } from "@angular/cdk/menu";
import { MatButtonModule } from "@angular/material/button";
import { MatRippleModule } from "@angular/material/core";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatSliderModule } from "@angular/material/slider";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatBadgeModule } from "@angular/material/badge";
import { MatDialog } from "@angular/material/dialog";

import { AppService } from "../../@services/app.service";
import { ContextMenuService } from "../../@services/context-menu.service";
import { ExtensionTabNavigationService } from "../../@services/extension-tab-navigation.service";
import { MonitorService } from "../../@services/monitor.service";
import { UrlService } from "../../@services/url.service";

import { getStatusDuration, getStatusName } from "../../helpers/app.helpers";
import { ContextMenuComponent } from "../context-menu/context-menu.component";
import { MonitorHeaderComponent } from "./monitor-header/monitor-header.component";
import { MonitorMenuComponent } from "./monitor-menu/monitor-menu.component";

import { IEvent } from "../../interfaces/driver-daily-log-events.interface";
import { TContextMenuAction, TFocusElementAction } from "../../types";
import {
  getHoursAndMinutes,
  getNoSpaceNote,
} from "../../helpers/monitor.helpers";
import { KeyboardService } from "../../@services/keyboard.service";
import { DateTime } from "luxon";
import { FormInputService } from "../../@services/form-input.service";
import { FixButtonComponent } from "./fix-button/fix-button.component";
import { ResizeFormComponent } from "./resize-form/resize-form.component";
import { EditFormComponent } from "./edit-form/edit-form.component";
import { EventComponent } from "./event/event.component";

@Component({
  selector: "app-monitor",
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    ContextMenuComponent,
    MatRippleModule,
    CdkMenuModule,

    MatSliderModule,
    MonitorHeaderComponent,
    MatBadgeModule,
    MonitorMenuComponent,

    FixButtonComponent,
    ResizeFormComponent,
    EditFormComponent,
    EventComponent,
  ],
  templateUrl: "./monitor.component.html",
  styleUrl: "./monitor.component.scss",
  providers: [],
})
export class MonitorComponent {
  @ViewChild("inputRef") myInputField!: ElementRef<HTMLInputElement>;
  @ViewChild("updateChangesButton")
  updateChangesButtonRef!: ElementRef<HTMLButtonElement>;
  DateTime = DateTime;
  getNoSpaceNote = getNoSpaceNote;

  monitorService = inject(MonitorService);
  urlService = inject(UrlService);
  appService = inject(AppService);
  contextMenuService = inject(ContextMenuService);
  extTabNavService = inject(ExtensionTabNavigationService);
  keyboardService = inject(KeyboardService);
  formInputService = inject(FormInputService);

  _snackBar = inject(MatSnackBar);
  readonly dialog = inject(MatDialog);

  statusText = "";
  contextMenuX = 0;
  contextMenuY = 0;
  selectedEvent: IEvent | null = null;

  contextMenuVisible = this.appService.contextMenuVisible;
  handleAction = this.contextMenuService.handleAction;

  driverInfo = this.monitorService.driverInfo;
  extendPTIBtnDisabled = this.monitorService.extendPTIBtnDisabled;
  addPTIBtnDisabled = this.monitorService.addPTIBtnDisabled;
  refreshBtnDisabled = this.monitorService.refreshBtnDisabled;

  getStatusDuration = getStatusDuration;
  getStatusName = getStatusName;
  getHoursAndMinutes = getHoursAndMinutes;

  selectedEventsIds = computed(() =>
    this.monitorService.selectedEvents().map((ev) => ev.id),
  );
  isUpdating = this.monitorService.isUpdating;

  showUpdateEvent = this.monitorService.showUpdateEvent;
  isUpdatingEvent = this.monitorService.isUpdatingEvent;
  currentEditEvent = this.monitorService.currentEditEvent;

  newOdometer = this.monitorService.newOdometer;
  newEventTypeId = this.monitorService.newEventTypeId;

  showResize = this.monitorService.showResize;
  isResizingEvent = this.monitorService.isResizingEvent;
  currentResizeDriving = this.monitorService.currentResizeDriving;
  showAdvancedResize = this.monitorService.showAdvancedResize;
  newResizeSpeed = this.monitorService.newResizeSpeed;
  newResizeDuration = this.monitorService.newResizeDuration;

  constructor() {
    effect(() => {
      const currentView = this.urlService.currentView();
      if (!currentView) return;

      const currentDriverId = currentView.driverId;
      const selectedEvents = this.monitorService.selectedEvents();

      if (!selectedEvents.length) return;

      console.log("[Monitor Component] selectedEvents", selectedEvents);
      if (currentDriverId !== this.monitorService.selectedEvents()[0].driver.id)
        this.monitorService.selectedEvents.set([]);
      setTimeout(
        () =>
          this.monitorService.selectedEvents().forEach((ev) => {
            ev.date.substring(0, 10) === currentView.date.substring(0, 10) &&
              this.urlService.focusElement(
                ev.id,
                "FOCUS_TACHOGRAPH_START",
                ev.statusName,
              );
          }),
        1500,
      );
    });
    effect(() => {
      const hovered = this.urlService.hoveredElement();
      const selectedTabIndex = this.extTabNavService.selectedTabIndex();
      if (!hovered || selectedTabIndex !== 2) return;
      const id = hovered.id;
      const element = document.getElementById(id!);

      if (element) {
        if (hovered.action === "HOVER_START") {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("highlighted");
        }
        if (hovered.action === "HOVER_STOP") {
          element.classList.remove("highlighted");
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.myInputField && this.myInputField.nativeElement.focus();
  }

  refresh = () => {
    this.refreshBtnDisabled.set(true);
    this.monitorService.refresh.update((value) => value + 1);

    this.newResizeSpeed.set(0);
    this.currentEditEvent.set(null);
    this.showUpdateEvent.set(null);
    this.monitorService.newNote.set("");
    this.newOdometer.set(0);
    this.currentResizeDriving.set(null);
    this.showResize.set(null);
  };

  focusElement(event: IEvent, action: TFocusElementAction) {
    if (event.driver.id !== event.driver.viewId) return;
    if (this.monitorService.isUpdating()) return;
    const currentView = this.urlService.currentView();
    if (
      !currentView ||
      !(event.date.substring(0, 10) === currentView.date.substring(0, 10))
    )
      return;
    if (this.selectedEventsIds().includes(event.id)) return;
    else this.urlService.focusElement(event.id, action, event.statusName);
  }

  selectEvent(event: IEvent) {
    if (
      this.currentEditEvent() ||
      this.showResize() ||
      this.showAdvancedResize() ||
      event.driver.id !== event.driver.viewId ||
      this.keyboardService.ctrlPressed()
    )
      return;

    this.monitorService.selectedEvents.update((prev) => {
      let newSelectedElements = [...prev];
      let selectedEventsIds = newSelectedElements.map((ev) => ev.id);

      if (selectedEventsIds.includes(event.id)) {
        return newSelectedElements.filter((ev) => ev.id !== event.id);
      }

      newSelectedElements.push(event);
      this.focusElement(event, "FOCUS_TACHOGRAPH_START");
      return newSelectedElements;
    });
  }

  onContextMenu($event: MouseEvent, event: IEvent) {
    $event.preventDefault();

    this.contextMenuX =
      window.innerWidth - $event.clientX < 150
        ? $event.clientX - 150
        : $event.clientX;
    this.contextMenuY =
      window.innerHeight - $event.clientY < 40
        ? $event.clientY - 40
        : $event.clientY;

    this.selectedEvent = event;
    this.contextMenuVisible.set(true);
  }

  toggleToolMenu() {
    this.monitorService.showToolMenu.update((prev) => !prev);
  }

  onMenuAction($event: { action: string; event: IEvent }) {
    console.log(`Action: ${$event.action} on event:`, $event.event);
  }

  handleContextMenuAction(action: TContextMenuAction, event?: IEvent) {
    this.contextMenuService.handleAction(action, event);
  }

  triggerButtonClick(): void {
    this.updateChangesButtonRef.nativeElement.click();
  }

  onChangeLogDate(date: string, id: number) {
    this.urlService.navigateChromeActiveTab(
      `https://app.monitoringdriver.com/logs/${id}/${date}/`,
    );
  }

  deselectAllEvents() {
    this.monitorService.selectedEvents.set([]);
  }
}
