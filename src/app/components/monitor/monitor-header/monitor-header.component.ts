import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import {
  IDriverDailyLogEvents,
  IDriverFmcsaInspection,
} from "../../../interfaces/driver-daily-log-events.interface";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatSnackBar } from "@angular/material/snack-bar";
import { ProgressBarService } from "../../../@services/progress-bar.service";
import { MatBadgeModule } from "@angular/material/badge";
import { BackendService } from "../../../@services/backend.service";

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
    MatBadgeModule,
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
  private progressBarService = inject(ProgressBarService);
  private backendService = inject(BackendService);
  private _snackBar = inject(MatSnackBar);

  DateTime = DateTime;

  driverInfo = this.monitorService.driverInfo;
  isUpdating = this.monitorService.isUpdating;
  selectedTabIndex = this.extTabNavService.selectedTabIndex;
  datePicker = new FormControl<Date>(DateTime.now().toJSDate());

  noteCount = () => {
    const backendData = this.backendService.backendData();
    const tenantId = this.driverDailyLog.tenantId;

    if (!backendData || !tenantId) return 0;

    const reports =
      backendData[0][tenantId]?.drivers[this.driverDailyLog.driverId];
    const problems =
      backendData[1][tenantId]?.drivers[this.driverDailyLog.driverId];
    const inspections =
      backendData[2][tenantId]?.drivers[this.driverDailyLog.driverId];

    if (reports || problems || inspections) {
      const notes = Object.keys(reports).length;

      const dots = inspections.length;
      const foundDots = [];
      for (const stamp in inspections) {
        for (let i = 0; i < dots; i++) {
          foundDots.push(
            JSON.parse(inspections[stamp][i].note) as IDriverFmcsaInspection,
          );
        }
      }
      const lastInspection = Math.max(
        ...foundDots.map((dot) => new Date(dot.time).getTime()),
      );

      return { notes: Object.keys(notes).length };
    } else return null;
  };

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

  showInfo() {
    this.progressBarService.showInfo.set(true);
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
