import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { FormControl, FormsModule, ReactiveFormsModule } from "@angular/forms";

import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatButtonModule } from "@angular/material/button";
import {
  MatDatepickerInputEvent,
  MatDatepickerModule,
} from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatRipple, provideNativeDateAdapter } from "@angular/material/core";

import { DateTime } from "luxon";

import { MonitorService } from "../../../@services/monitor.service";
import { formatTenantName } from "../../../helpers/monitor.helpers";
import { ExtensionTabNavigationService } from "../../../@services/extension-tab-navigation.service";
import { IDriverDailyLogEvents } from "../../../interfaces/driver-daily-log-events.interface";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatSnackBar } from "@angular/material/snack-bar";

@Component({
  selector: "app-monitor-header",
  providers: [provideNativeDateAdapter()],
  imports: [
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    FormsModule,
    MatProgressSpinnerModule,
    DatePipe,
    MatDatepickerModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatRipple,
    MatTooltipModule,
  ],
  templateUrl: "./monitor-header.component.html",
  styleUrl: "./monitor-header.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitorHeaderComponent {
  @HostListener("window:keydown", ["$event"])
  handleWindowKeyboardEvent(event: KeyboardEvent) {
    this.handleKeyboardEvent(event);
  }

  @Input() driverDailyLog!: IDriverDailyLogEvents;

  @Output() changeLogDate = new EventEmitter<string>();

  private monitorService = inject(MonitorService);
  private extTabNavService = inject(ExtensionTabNavigationService);
  private _snackBar = inject(MatSnackBar);

  DateTime = DateTime;

  driverInfo = this.monitorService.driverInfo;
  isUpdating = this.monitorService.isUpdating;
  selectedTabIndex = this.extTabNavService.selectedTabIndex;
  datePicker = new FormControl<Date>(DateTime.now().toJSDate());

  formatTenantName = formatTenantName;

  until30minBreak() {
    const mustHaveBreakBy = this.driverDailyLog.hosDetails?.mustHaveBreakBy;
    if (!mustHaveBreakBy) return null;

    const untilViolation = DateTime.fromISO(mustHaveBreakBy, { zone: "utc" });
    const now = DateTime.now();

    const duration = untilViolation.diff(now, [
      "hours",
      "minutes",
      "seconds",
      "milliseconds",
    ]);
    const ms = untilViolation.diff(now, "milliseconds");

    const time = duration.toFormat("m");
    const seconds = ms.as("seconds");

    return { time, seconds };
  }

  trimLeadingZero(time: string) {
    if (time && time.charAt(0) === "0") {
      return time.slice(1);
    }
    return time;
  }

  onChangeLogDate(date: string | null) {
    if (!date) return;
    this.changeLogDate.emit(date);
  }

  private handleKeyboardEvent(event: KeyboardEvent) {
    if (
      this.selectedTabIndex() === 2 &&
      !this.monitorService.showUpdateEvent()
    ) {
      switch (event.key) {
        case "ArrowLeft":
          if (this.driverDailyLog.previousLogDate) {
            this.onChangeLogDate(this.driverDailyLog.previousLogDate);
            event.preventDefault();
          }
          break;
        case "ArrowRight":
          if (this.driverDailyLog.nextLogDate) {
            this.onChangeLogDate(this.driverDailyLog.nextLogDate);
            event.preventDefault();
          }
          break;

        default:
          break;
      }
    }
  }

  copyDriverName(name: string) {
    navigator.clipboard.writeText(name);
    this._snackBar.open(`Copied: ${name}`, "OK", { duration: 1500 });
  }

  onDateChange(event: MatDatepickerInputEvent<Date>) {
    const date = DateTime.fromJSDate(event.value as Date)
      .toUTC()
      .toISO();

    this.changeLogDate.emit(date!);
  }

  get date() {
    const zone = this.monitorService.driverDailyLog()?.homeTerminalTimeZone!;
    const date = this.monitorService.driverDailyLog()?.date!;

    return DateTime.fromISO(date).setZone(zone).toISO();
  }
}
