import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CdkMenuModule } from '@angular/cdk/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';

import { Duration } from 'luxon';

import { AppService } from '../../@services/app.service';
import { ContextMenuService } from '../../@services/context-menu.service';
import { ExtensionTabNavigationService } from '../../@services/extension-tab-navigation.service';
import { MonitorService } from '../../@services/monitor.service';
import { UrlService } from '../../@services/url.service';
import { AutofocusAndHandleOutsideClickDirective } from '../../directive/autofocus.directive';
import { getStatusDuration, getStatusName } from '../../helpers/app.helpers';
import { ContextMenuComponent } from '../context-menu/context-menu.component';
import { CancelComponent } from '../UI/cancel/cancel.component';
import { SaveComponent } from '../UI/save/save.component';
import { MonitorHeaderComponent } from './monitor-header/monitor-header.component';
import { MonitorMenuComponent } from './monitor-menu/monitor-menu.component';

import { DurationPipe } from '../../pipes/duration.pipe';

import { IEvent } from '../../interfaces/driver-daily-log-events.interface';
import { TContextMenuAction, TFocusElementAction } from '../../types';
import { TimeInputComponent } from '../UI/clock/time-input.component';
import { getHoursAndMinutes } from '../../helpers/monitor.helpers';

@Component({
  selector: 'app-monitor',
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
    DurationPipe,
    AutofocusAndHandleOutsideClickDirective,
    SaveComponent,
    CancelComponent,
    MatSliderModule,
    MonitorHeaderComponent,
    MatBadgeModule,
    MonitorMenuComponent,
    TimeInputComponent,
  ],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.scss',
  providers: [],
})
export class MonitorComponent {
  @ViewChild('inputRef') myInputField!: ElementRef<HTMLInputElement>;
  @ViewChild('updateChangesButton')
  updateChangesButtonRef!: ElementRef<HTMLButtonElement>;

  monitorService = inject(MonitorService);
  urlService = inject(UrlService);
  appService = inject(AppService);
  contextMenuService = inject(ContextMenuService);
  extTabNavService = inject(ExtensionTabNavigationService);

  _snackBar = inject(MatSnackBar);
  readonly dialog = inject(MatDialog);

  statusText = '';
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
  newNote = this.monitorService.newNote;
  newOdometer = this.monitorService.newOdometer;
  newEventTypeId = this.monitorService.newEventTypeId;
  newStatusName = computed(() => {
    return getStatusName(this.monitorService.newEventType());
  });
  directionForward = signal(true);

  showResize = this.monitorService.showResize;
  isResizingEvent = this.monitorService.isResizingEvent;
  currentResizeDriving = this.monitorService.currentResizeDriving;
  showAdvancedResize = this.monitorService.showAdvancedResize;
  newResizeSpeed = this.monitorService.newResizeSpeed;

  newResizeDuration = computed(() => {
    const resizeEvent = this.currentResizeDriving();
    const newSpeed = this.newResizeSpeed();
    if (!resizeEvent || !newSpeed) return;
    const originalSpeed = resizeEvent.averageSpeed * 10000; // upscale x 1000
    const originalDuration = resizeEvent.realDurationInSeconds;
    const distance = originalSpeed * (originalDuration / 3600);

    return ((distance / newSpeed) * 3600) / 10000; // downscale x 1000
  });

  constructor() {
    effect(() => {
      const currentDriverId = this.urlService.currentView()?.driverId;
      if (!currentDriverId) return;
      const selectedEvents = this.monitorService.selectedEvents();
      if (!selectedEvents.length) return;

      if (currentDriverId !== this.monitorService.selectedEvents()[0].driver.id)
        this.monitorService.selectedEvents.set([]);
    });
    effect(() => {
      const hovered = this.urlService.hoveredElement();
      const selectedTabIndex = this.extTabNavService.selectedTabIndex();
      if (!hovered || selectedTabIndex !== 2) return;
      const id = hovered.id;
      const element = document.getElementById(id!);

      if (element) {
        if (hovered.action === 'HOVER_START') {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlighted');
        }
        if (hovered.action === 'HOVER_STOP') {
          element.classList.remove('highlighted');
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.myInputField && this.myInputField.nativeElement.focus();
    // const monitor = document.getElementById('monitor');
    // monitor && (monitor.scrollLeft -= 50);
  }

  refresh = () => {
    this.refreshBtnDisabled.set(true);
    this.monitorService.refresh.update((value) => value + 1);

    this.newResizeSpeed.set(0);
    this.currentEditEvent.set(null);
    this.showUpdateEvent.set(null);
    this.newNote.set('');
    this.newOdometer.set(0);
    this.currentResizeDriving.set(null);
    this.showResize.set(null);
  };

  getNoSpaceNote(note: string) {
    return note.replace(/\s/g, '');
  }

  focusElement(event: IEvent, action: TFocusElementAction) {
    if (event.driver.id !== event.driver.viewId) return;
    if (this.monitorService.isUpdating()) return;
    this.urlService.focusElement(event.id, action, event.statusName);
  }

  selectEvent(event: IEvent) {
    if (this.currentEditEvent() || this.showResize()) return;

    this.monitorService.selectedEvents.update((prev) => {
      let newSelectedElements = [...prev];
      let selectedEventsIds = newSelectedElements.map((ev) => ev.id);

      if (selectedEventsIds.includes(event.id)) {
        return newSelectedElements.filter((ev) => ev.id !== event.id);
      }

      newSelectedElements.push(event);
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

  handleDoubleClick(event: IEvent) {
    this.monitorService.selectedEvents.set([]);

    this.currentResizeDriving.set(null);
    this.showResize.set(null);
    this.newResizeSpeed.set(0);

    this.currentEditEvent.set(event);
    this.showUpdateEvent.set(event.id);
    this.newOdometer.set(event.odometer);

    this.newEventTypeId.set(
      this.monitorService.eventTypes.findIndex(
        (type) => type === event.dutyStatus,
      ),
    );
    this.newNote.set('');
    if (
      [
        'ChangeToOffDutyStatus',
        'ChangeToSleeperBerthStatus',
        'ChangeToOnDutyNotDrivingStatus',
      ].includes(event.dutyStatus)
    ) {
      this.newNote.set(event.notes);
    }

    return;
  }

  cancelEventEdit() {
    this.currentEditEvent.set(null);
    this.showUpdateEvent.set(null);
    this.newNote.set('');
  }

  cancelResize() {
    this.currentResizeDriving.set(null);
    this.newResizeSpeed.set(0);
    this.showResize.set(null);
    this.showAdvancedResize.set(null);
    this.showAdvancedResize.set(null);
  }

  resize() {
    const event = this.currentResizeDriving();
    const seconds = this.newResizeDuration();
    if (!event || !seconds) {
      this._snackBar.open(
        `[Monitor Component] error occurred, refreshing page... `,
        'OK',
        { duration: 3000 },
      );
      return this.refresh();
    }
    const duration = Duration.fromObject({ seconds }).toFormat('hh:mm:ss');
    const durationAsTimeSpan = `${new Date().getTime()}`;

    const advancedResize = this.showAdvancedResize();
    if (advancedResize) {
      return this.contextMenuService.handleAction('ADVANCED_RESIZE', event, {
        resizePayload: { duration, durationAsTimeSpan },
        parsedErrorInfo: advancedResize,
      });
    }

    return this.contextMenuService.handleAction('RESIZE', event, {
      duration,
      durationAsTimeSpan,
    });
  }

  updateChanges() {
    const event = this.currentEditEvent();
    const totalVehicleMiles = this.newOdometer();
    const eventTypeCode = this.monitorService.newEventType();
    const note = [
      'ChangeToOffDutyStatus',
      'ChangeToSleeperBerthStatus',
      'ChangeToOnDutyNotDrivingStatus',
    ].includes(eventTypeCode)
      ? this.newNote()
      : '';

    if (!event) {
      this._snackBar.open(
        `[Monitor Component] error occurred, refreshing page... `,
        'OK',
        { duration: 3000 },
      );
      return this.refresh();
    }
    if (!note) {
      this._snackBar.open(`[Monitor Component] error: invalid note`, 'OK', {
        duration: 3000,
      });
    }
    if (!totalVehicleMiles) {
      return this._snackBar.open(
        `[Monitor Component] error: invalid odometer value`,
        'OK',
        { duration: 3000 },
      );
    }

    this.currentEditEvent.set(null);
    this.contextMenuService.handleAction('UPDATE_EVENT', event, {
      totalVehicleMiles,
      note,
      eventTypeCode,
    });
  }

  triggerButtonClick(): void {
    this.updateChangesButtonRef.nativeElement.click();
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const isResizingEvent = this.isResizingEvent();
    const newResizeSpeed = this.newResizeSpeed();

    if (isResizingEvent) return;

    let constDown = -0.06;
    let constUp = 0.07;

    if (newResizeSpeed < 70) {
      constDown = -0.19;
      constUp = 0.22;
    }
    if (newResizeSpeed < 66) {
      constDown = -0.25;
      constUp = 0.28;
    }
    if (newResizeSpeed < 64) {
      constDown = -0.44;
      constUp = 0.49;
    }
    if (newResizeSpeed < 62) {
      constDown = -0.76;
      constUp = 0.77;
    }
    if (newResizeSpeed < 50) {
      constDown = -1.66;
      constUp = 1.77;
    }

    const delta = event.deltaY > 0 ? constDown : constUp;
    let newSliderValue = newResizeSpeed + delta;
    if (newSliderValue < 0.01) newSliderValue = 0.01;
    if (newSliderValue > 99.99) newSliderValue = 99.99;

    this.newResizeSpeed.set(newSliderValue);
  }

  onChangeLogDate(date: string, id: number) {
    this.urlService.navigateChromeActiveTab(
      `https://app.monitoringdriver.com/logs/${id}/${date}/`,
    );
  }

  copyValue(value: string) {
    navigator.clipboard.writeText(value);
    this._snackBar.open(`Copied: ${value}`, 'OK', { duration: 1500 });
  }

  deselectAllEvents() {
    this.monitorService.selectedEvents.set([]);
  }

  markBreaksAndShift(event: IEvent) {
    let breakShift: string;
    const driver = event.driver.id !== event.driver.viewId ? ' co-driver' : '';
    switch (event.break) {
      case 0:
        breakShift = 'shift';
        break;
      case 10:
        breakShift = 'ten-hour-break';
        break;
      case 34:
        breakShift = 'cycle-break';
        break;
      default:
        breakShift = 'undefined';
        break;
    }
    return breakShift + driver;
  }

  onEditDirection(wheelEvent: WheelEvent) {
    wheelEvent.preventDefault();
    this.directionForward.update((prev) => !prev);
  }

  onEditStatusWheel(wheelEvent: WheelEvent) {
    wheelEvent.preventDefault();
    const maxToggle = this.monitorService.eventTypes.length - 1;
    let toggle = this.monitorService.newEventTypeId();
    if (wheelEvent.deltaY > 0) {
      toggle === maxToggle ? (toggle = 0) : toggle++;
    } else {
      toggle === 0 ? (toggle = maxToggle) : toggle--;
    }

    this.monitorService.newEventTypeId.set(toggle);
  }
}
