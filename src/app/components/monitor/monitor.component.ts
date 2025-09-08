import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
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

import { AppService } from '../../@services/app.service';
import { ContextMenuService } from '../../@services/context-menu.service';
import { ExtensionTabNavigationService } from '../../@services/extension-tab-navigation.service';
import { MonitorService } from '../../@services/monitor.service';
import { UrlService } from '../../@services/url.service';
import { AutofocusAndHandleOutsideClickDirective } from '../../directive/autofocus.directive';
import { getStatusDuration } from '../../helpers/app.helpers';
import { ContextMenuComponent } from '../context-menu/context-menu.component';
import { CancelComponent } from '../UI/cancel/cancel.component';
import { SaveComponent } from '../UI/save/save.component';

import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Duration } from 'luxon';
import { IEvent } from '../../interfaces/driver-daily-log-events.interface';
import { DurationPipe } from '../../pipes/duration.pipe';
import { TContextMenuAction, TFocusElementAction } from '../../types';
import { MonitorHeaderComponent } from './monitor-header/monitor-header.component';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../UI/dialog/dialog.component';
import { IShiftInputState } from '../../interfaces/api.interface';

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

  selectedEventsIds = computed(() =>
    this.monitorService.selectedEvents().map((ev) => ev.id),
  );
  isUpdating = this.monitorService.isUpdating;

  showUpdateEvent = this.monitorService.showUpdateEvent;
  isUpdatingEvent = this.monitorService.isUpdatingEvent;
  currentEditEvent = this.monitorService.currentEditEvent;
  newNote = this.monitorService.newNote;
  newOdometer = this.monitorService.newOdometer;

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
    const monitor = document.getElementById('monitor');
    monitor && (monitor.scrollLeft -= 50);
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
        {
          duration: 3000,
        },
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
    const note = this.newNote();
    const totalVehicleMiles = this.newOdometer();
    if (!event) {
      this._snackBar.open(
        `[Monitor Component] error occurred, refreshing page... `,
        'OK',
        {
          duration: 3000,
        },
      );
      return this.refresh();
    }
    if (!note) {
      this._snackBar.open(`[Monitor Component] error: invalid note`, 'OK', {
        duration: 3000,
      });
    }
    if (!totalVehicleMiles) {
      this._snackBar.open(
        `[Monitor Component] error: invalid odometer value`,
        'OK',
        {
          duration: 3000,
        },
      );
    }
    this.currentEditEvent.set(null);
    this.contextMenuService.handleAction('UPDATE_EVENT', event, {
      totalVehicleMiles,
      note,
    });
  }

  triggerButtonClick(): void {
    this.updateChangesButtonRef.nativeElement.click();
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    if (this.isResizingEvent()) return;
    const delta = event.deltaY > 0 ? -0.06 : 0.07;
    const newSliderValue = this.newResizeSpeed() + delta;

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

  openDialog() {
    const _dialogRef = this.dialog.open(DialogComponent);
    const selectedEvents = this.monitorService.selectedEvents();
    if (!selectedEvents) {
      this._snackBar.open(
        `Shift operation failed. \n[selectedEvents] ${selectedEvents}`,
        'OK',
        {
          duration: 7000,
        },
      );
      return;
    }

    _dialogRef.afterClosed().subscribe({
      next: (payload: IShiftInputState) => {
        console.log('qqqqqqqqqqqqqqqqqqq', selectedEvents, payload);
        this.contextMenuService.handleMultiEventAction(
          'SHIFT_EVENTS',
          selectedEvents,
          payload,
        );
      },
    });
  }
}
