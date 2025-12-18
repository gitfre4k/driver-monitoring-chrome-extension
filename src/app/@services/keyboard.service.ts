import { inject, Injectable, signal } from '@angular/core';
import { ExtensionTabNavigationService } from './extension-tab-navigation.service';
import { MatDialog } from '@angular/material/dialog';
import { MonitorService } from './monitor.service';
import { DialogConfirmComponent } from '../components/UI/dialog-confirm/dialog-confirm.component';
import { ContextMenuService } from './context-menu.service';
import { ZipService } from './zip.service';
import { UrlService } from './url.service';

@Injectable({
  providedIn: 'root',
})
export class KeyboardService {
  extensionTabNavService = inject(ExtensionTabNavigationService);
  monitorService = inject(MonitorService);
  contextMenuService = inject(ContextMenuService);
  zipService = inject(ZipService);
  urlService = inject(UrlService);

  readonly dialog = inject(MatDialog);

  ctrlPressed = signal(false);
  isDeleteDialogOpen = signal(false);

  constructor() {
    window.addEventListener('keydown', (event) => {
      const target = event.target;

      if (target instanceof HTMLElement) {
        if (
          target.nodeName.toLowerCase() === 'input' ||
          target.nodeName.toLowerCase() === 'textarea' ||
          target.isContentEditable
        ) {
          return;
        }
      }
      if (this.extensionTabNavService.selectedTabIndex() === 2) {
        if (event.ctrlKey) {
          switch (event.key) {
            case 'a':
            case 'A': {
              if (
                this.monitorService.currentEditEvent() ||
                this.monitorService.showResize()
              )
                break;
              event.preventDefault();
              return this.monitorService.selectAllEvents();
            }
            // case 'ArrowUp': {}
            // case 'ArrowDown': {}
          }
        }
        switch (event.key) {
          case 'Control':
            return this.ctrlPressed.set(true);
          case 'Shift':
            return (
              !this.monitorService.isShiftingDialogOpen() &&
              this.monitorService.openShiftDialog()
            );
          case 'z':
          case 'Z':
          case '0': {
            if (this.zipService.isZipOpen()) return;
            const events = this.monitorService.selectedEvents();
            if (events.length === 0) return;
            else {
              const tenant = this.urlService.tenant();
              const logInfo = this.urlService.currentView();
              if (!tenant || !logInfo) return;
              const { driverId, date } = logInfo;
              return this.zipService.zip(tenant, driverId, date);
            }
          }
          case 'Delete':
          case 'x':
          case 'X': {
            if (this.isDeleteDialogOpen()) return;

            const events = this.monitorService.selectedEvents();
            if (events.length === 0) return;

            this.isDeleteDialogOpen.set(true);

            const eventsOnSameDay = events.every(
              (ev) => ev.date === events[0].date,
            );

            const dialogConfig1 = {
              width: '250px',
              data: {
                title: 'Delete Events',
                message: `Are you sure you want to proceed?`,
                info: `[${events.length}] event${events.length === 1 ? '' : 's'} selected`,
              },
            };

            const dialogConfig2 = {
              width: '250px',
              data: {
                title: 'Delete Events',
                message: `Are you sure you want to proceed?`,
                info: `[${events.length}] events selected`,
                warning: 'NOT ALL EVENTS ARE ON THE SAME DAY',
              },
            };

            this.dialog
              .open(DialogConfirmComponent, dialogConfig1)
              .afterClosed()
              .subscribe((result1) => {
                if (result1) {
                  if (eventsOnSameDay) {
                    this.contextMenuService.handleMultiEventAction(
                      'DELETE_SELECTED_EVENTS',
                      events,
                    );
                    this.isDeleteDialogOpen.set(false);
                  } else {
                    this.dialog
                      .open(DialogConfirmComponent, dialogConfig2)
                      .afterClosed()
                      .subscribe((result2) => {
                        if (result2) {
                          this.contextMenuService.handleMultiEventAction(
                            'DELETE_SELECTED_EVENTS',
                            events,
                          );
                        }
                        this.isDeleteDialogOpen.set(false);
                      });
                  }
                }
                this.isDeleteDialogOpen.set(false);
              });
          }
        }
      }
    });
    window.addEventListener('keyup', (event) => {
      if (
        event.key === 'Control' &&
        this.extensionTabNavService.selectedTabIndex() === 2
      ) {
        this.ctrlPressed.set(false);
      }
    });
    window.addEventListener('blur', () => {
      this.ctrlPressed.set(false);
    });

    // SHIFT

    //
    //
  }
}
