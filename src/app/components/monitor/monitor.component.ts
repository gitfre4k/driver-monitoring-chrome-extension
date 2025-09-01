import { Component, effect, inject } from '@angular/core';

import { CommonModule } from '@angular/common';
import { MonitorService } from '../../@services/monitor.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';

import { DateTime } from 'luxon';

import { UrlService } from '../../@services/url.service';
import { ContextMenuComponent } from '../context-menu/context-menu.component';
import { AppService } from '../../@services/app.service';
import { ContextMenuService } from '../../@services/context-menu.service';
import { getStatusDuration } from '../../helpers/app.helpers';

import { IEvent } from '../../interfaces/driver-daily-log-events.interface';
import { TContextMenuAction, TFocusElementAction } from '../../types';
import { DurationPipe } from '../../pipes/duration.pipe';
import { ExtensionTabNavigationService } from '../../@services/extension-tab-navigation.service';

@Component({
  selector: 'app-monitor',
  imports: [
    CommonModule,
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
  ],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.scss',
  providers: [],
})
export class MonitorComponent {
  monitorService = inject(MonitorService);
  urlService = inject(UrlService);
  appService = inject(AppService);
  contextMenuService = inject(ContextMenuService);
  extTabNavService = inject(ExtensionTabNavigationService);

  driverInfo = this.monitorService.driverInfo;
  extendPTIBtnDisabled = this.monitorService.extendPTIBtnDisabled;
  addPTIBtnDisabled = this.monitorService.addPTIBtnDisabled;
  refreshBtnDisabled = this.monitorService.refreshBtnDisabled;
  showToolMenu = this.monitorService.showToolMenu;

  statusText = '';
  contextMenuVisible = this.appService.contextMenuVisible;
  contextMenuX = 0;
  contextMenuY = 0;
  selectedEvent: IEvent | null = null;

  getStatusDuration = getStatusDuration;

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
          element.classList.add('selected');
        }
        if (hovered.action === 'HOVER_STOP') {
          element.classList.remove('selected');
        }
      }
    });
  }

  refresh = () => {
    this.refreshBtnDisabled.set(true);
    this.monitorService.refresh.update((value) => value + 1);
  };

  get date() {
    const zone = this.monitorService.driverDailyLog()?.homeTerminalTimeZone!;
    const date = this.monitorService.driverDailyLog()?.date!;

    return DateTime.fromISO(date).setZone(zone).toISO();
  }

  getNoSpaceNote(note: string) {
    return note.replace(/\s/g, '');
  }

  focusElement(event: IEvent, action: TFocusElementAction) {
    if (event.driver.id !== event.driver.viewId) return;
    if (this.monitorService.isUpdating()) return;
    this.urlService.focusElement(event.id, action, event.statusName);
  }

  formatTenantName(tenant: string) {
    const keywordsToRemove = new Set([
      'logistics',
      'transport',
      'transportations',
      'Transportation',
      'express',
      'enterprises',
      'enterprise',
      'freight',
      'international',
      'cargo',
      'services',
      'trucking',
      'systems',
      'transporting',
    ]);
    let words = tenant.replace(/,/g, '').trim().split(' ');

    if (words.length === 0) return '';

    let lastWord = words[words.length - 1];
    if (
      lastWord.length === 3 ||
      (lastWord.length === 4 && lastWord[lastWord.length - 1] === '.')
    )
      words.pop();
    if (words.length > 0) {
      const newLastWord = words[words.length - 1];
      if (keywordsToRemove.has(newLastWord.toLowerCase())) words.pop();
    }

    return words.join(' ');
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
    this.showToolMenu.update((prev) => !prev);
  }

  onMenuAction($event: { action: string; event: IEvent }) {
    console.log(`Action: ${$event.action} on event:`, $event.event);
  }

  handleContextMenuAction(action: TContextMenuAction, event?: IEvent) {
    this.contextMenuService.handleAction(action, event);
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
