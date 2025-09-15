import { inject, Injectable, signal } from "@angular/core";
import { ExtensionTabNavigationService } from "./extension-tab-navigation.service";
import { MatDialog } from "@angular/material/dialog";
import { DialogComponent } from "../components/UI/dialog/dialog.component";
import { MonitorService } from "./monitor.service";
import { DialogConfirmComponent } from "../components/UI/dialog-confirm/dialog-confirm.component";
import { ContextMenuService } from "./context-menu.service";

@Injectable({
  providedIn: "root",
})
export class KeyboardService {
  extensionTabNavService = inject(ExtensionTabNavigationService);
  monitorService = inject(MonitorService);
  contextMenuService = inject(ContextMenuService);

  readonly dialog = inject(MatDialog);

  ctrlPressed = signal(false);

  constructor() {
    window.addEventListener("keydown", (event) => {
      if (this.extensionTabNavService.selectedTabIndex() === 2) {
        if (event.ctrlKey) {
          switch (event.key) {
            case "a": {
              event.preventDefault();
              return this.monitorService.selectAllEvents();
            }
            // case 'ArrowUp': {}
            // case 'ArrowDown': {}
          }
        }
        switch (event.key) {
          case "Control":
            return this.ctrlPressed.set(true);
          case "Shift":
            return (
              !this.monitorService.isShiftingDialogOpen() &&
              this.monitorService.openShiftDialog()
            );
          case "Delete": {
            const events = this.monitorService.selectedEvents();
            if (events.length === 0) return;

            const eventsOnSameDay = events.every(
              (ev) => ev.date === events[0].date,
            );

            const dialogRef = this.dialog.open(DialogConfirmComponent, {
              width: "250px",
              data: {
                title: "Delete Events",
                message: `Are you sure you want to proceed?`,
                info: `[${events.length}] event${events.length === 1 ? "" : "s"} selected`,
                warning: eventsOnSameDay
                  ? null
                  : "NOT ALL EVENTS ARE ON THE SAME DAY",
              },
            });

            dialogRef.afterClosed().subscribe((result) => {
              if (result) {
                this.contextMenuService.handleMultiEventAction(
                  "DELETE_SELECTED_EVENTS",
                  events,
                );
              }
            });
          }
        }
      }
    });
    window.addEventListener("keyup", (event) => {
      if (
        event.key === "Control" &&
        this.extensionTabNavService.selectedTabIndex() === 2
      ) {
        this.ctrlPressed.set(false);
      }
    });
    window.addEventListener("blur", () => {
      this.ctrlPressed.set(false);
    });

    // SHIFT

    //
    //
  }
}
