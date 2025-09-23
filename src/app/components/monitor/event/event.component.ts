import { Component, inject, input } from "@angular/core";
import {
  IDriverLogViolation,
  IEvent,
} from "../../../interfaces/driver-daily-log-events.interface";
import { DateTime } from "luxon";
import { KeyboardService } from "../../../@services/keyboard.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MonitorService } from "../../../@services/monitor.service";
import { FormInputService } from "../../../@services/form-input.service";
import { CommonModule } from "@angular/common";
import { IntermediateComponent } from "../../UI/intermediate/intermediate.component";
import { EngineOnComponent } from "../../UI/engine-on/engine-on.component";
import { EngineComponent } from "../../UI/engine/engine.component";
import { getNoSpaceNote } from "../../../helpers/monitor.helpers";
import { getStatusDuration } from "../../../helpers/app.helpers";
import { DurationPipe } from "../../../pipes/duration.pipe";
import { ContextMenuService } from "../../../@services/context-menu.service";

@Component({
  selector: "app-event",
  imports: [
    CommonModule,
    IntermediateComponent,
    EngineOnComponent,
    EngineComponent,
    DurationPipe,
  ],
  templateUrl: "./event.component.html",
  styleUrl: "./event.component.scss",
})
export class EventComponent {
  event = input.required<IEvent>();
  violations = input.required<IDriverLogViolation[]>();
  parentName = input.required<string>();

  monitorService = inject(MonitorService);
  keyboardService = inject(KeyboardService);
  formInputService = inject(FormInputService);
  contextMenuService = inject(ContextMenuService);

  private _snackBar = inject(MatSnackBar);

  getNoSpaceNote = getNoSpaceNote;
  getStatusDuration = getStatusDuration;

  handleDoubleClick(event: IEvent) {
    this.monitorService.selectedEvents.set([]);

    this.monitorService.currentResizeDriving.set(null);
    this.monitorService.showResize.set(null);
    this.monitorService.newResizeSpeed.set(0);

    this.monitorService.currentEditEvent.set(event);
    this.monitorService.showUpdateEvent.set(event.id);
    this.monitorService.newOdometer.set(event.odometer);

    this.formInputService.geolocation.set(null);
    this.formInputService.latitude.set("");
    this.formInputService.longitude.set("");

    this.monitorService.newEventTypeId.set(
      this.monitorService.eventTypes.findIndex(
        (type) => type === event.dutyStatus,
      ),
    );
    this.monitorService.newNote.set("");
    if (
      [
        "ChangeToOffDutyStatus",
        "ChangeToSleeperBerthStatus",
        "ChangeToOnDutyNotDrivingStatus",
      ].includes(event.dutyStatus)
    ) {
      this.monitorService.newNote.set(event.notes);
    }

    return;
  }

  markBreaksAndShift(event: IEvent) {
    let breakShift = "";

    if (event.driver.id === event.driver.viewId) {
      switch (event.break) {
        case 0:
          breakShift = "shift";
          break;
        case 10:
          breakShift = "ten-hour-break";
          break;
        case 34:
          breakShift = "cycle-break";
          break;
        default:
          breakShift = "undefined";
          break;
      }
    }

    return breakShift;
  }

  addViolationClass(event: IEvent, violations: IDriverLogViolation[]) {
    let isViolation = false;
    const eventStartTime = DateTime.fromISO(event.realStartTime)
      .toJSDate()
      .getTime();
    violations.forEach((v) => {
      if (v.startTime <= eventStartTime && v.endTime >= eventStartTime)
        isViolation = true;
    });
    return isViolation;
  }

  copyValue(value: string) {
    if (!this.keyboardService.ctrlPressed()) return;
    navigator.clipboard.writeText(value);
    this._snackBar.open(`Copied: ${value}`, "OK", { duration: 1500 });
  }
  copyLocation(event: IEvent) {
    this.contextMenuService.handleAction("COPY_LOCATION", event);
  }
}
