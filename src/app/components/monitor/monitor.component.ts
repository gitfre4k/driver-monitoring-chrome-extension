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

import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
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
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
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

  openDialog() {
    this.dialog.open(DialogComponent);
  }

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

  selectedEvents = this.monitorService.selectedEvents;
  isUpdating = this.monitorService.isUpdating;

  showUpdateEvent = this.monitorService.showUpdateEvent;
  isUpdatingEvent = this.monitorService.isUpdatingEvent;
  currentEditEvent = this.monitorService.currentEditEvent;
  newNote = this.monitorService.newNote;
  newOdometer = this.monitorService.newOdometer;

  showResize = this.monitorService.showResize;
  isResizingEvent = this.monitorService.isResizingEvent;
  maxResize = this.monitorService.maxResize;
  currentResizeDriving = this.monitorService.currentResizeDriving;
  showAdvancedResize = this.monitorService.showAdvancedResize;
  newResize = this.monitorService.newResize;

  newSpeed = computed(() => {
    const currentDriving = this.currentResizeDriving();
    const newDuration = this.newResize();
    if (!currentDriving || !newDuration) return;
    const currentSpeed = currentDriving.averageSpeed;
    const currentDuration = currentDriving.realDurationInSeconds;
    const distance = currentSpeed * (currentDuration / 3600);

    return distance / (newDuration / 3600);
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
    this.newResize.set(0);
  };

  getNoSpaceNote(note: string) {
    return note.replace(/\s/g, '');
  }

  focusElement(event: IEvent, action: TFocusElementAction) {
    if (event.driver.id !== event.driver.viewId) return;
    if (this.monitorService.isUpdating()) return;
    this.urlService.focusElement(event.id, action, event.statusName);
  }

  selectEvent(id: number) {
    this.monitorService.selectedEvents.update((prev) => {
      const newSelectedElements = [...prev];

      if (newSelectedElements.includes(id)) {
        newSelectedElements.findIndex(
          (index) => newSelectedElements[index] === id
        );
        return newSelectedElements.filter((eventId) => eventId !== id);
      }

      newSelectedElements.push(id);
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
    if (
      [
        'ChangeToOffDutyStatus',
        'ChangeToSleeperBerthStatus',
        'ChangeToOnDutyNotDrivingStatus',
      ].includes(event.dutyStatus)
    ) {
      this.currentResizeDriving.set(null);
      this.showResize.set(null);
      this.newResize.set(0);

      this.currentEditEvent.set(event);
      this.showUpdateEvent.set(event.id);
      this.newNote.set(event.notes);
      this.newOdometer.set(event.odometer);
    }
    if (event.dutyStatus === 'ChangeToDrivingStatus') {
      this.currentEditEvent.set(null);
      this.showUpdateEvent.set(null);
      this.newNote.set('');
      this.newOdometer.set(0);

      this.currentResizeDriving.set(event);
      this.showResize.set(event.id);
      this.newResize.set(event.realDurationInSeconds);
    }
    return;
  }

  cancelEventEdit() {
    this.currentEditEvent.set(null);
    this.showUpdateEvent.set(null);
  }

  cancelResize() {
    this.currentResizeDriving.set(null);
    this.newResize.set(0);
    this.showResize.set(null);
    this.showAdvancedResize.set(null);
    this.showAdvancedResize.set(null);
  }

  resize() {
    const event = this.currentResizeDriving();
    const seconds = this.newResize();
    if (!event || !seconds) {
      this._snackBar.open(
        `[Monitor Component] error occurred, refreshing page... `,
        'OK',
        {
          duration: 3000,
        }
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
        }
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
        }
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
    const delta = event.deltaY > 0 ? -31 : 31;
    const newSliderValue = this.newResize() + delta;

    this.newResize.set(Math.max(3600, Math.min(28799, newSliderValue)));
  }

  onChangeLogDate(date: string, id: number) {
    this.urlService.navigateChromeActiveTab(
      `https://app.monitoringdriver.com/logs/${id}/${date}/`
    );
  }

  copyValue(value: string) {
    navigator.clipboard.writeText(value);
    this._snackBar.open(`Copied: ${value}`, 'OK', { duration: 1500 });
  }

  deselectAllEvents() {
    this.selectedEvents.set([]);
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
}
