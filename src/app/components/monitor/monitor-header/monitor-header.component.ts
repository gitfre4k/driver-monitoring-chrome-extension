import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
  ViewEncapsulation,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { FormControl, FormsModule, ReactiveFormsModule } from "@angular/forms";

import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatButtonModule } from "@angular/material/button";
import {
  MatCalendarCellClassFunction,
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
import { ProgressBarService } from "../../../@services/progress-bar.service";
import { MatBadgeModule } from "@angular/material/badge";
import { BackendService } from "../../../@services/backend.service";
import { getNote, parseMalf } from "../../../helpers/backend.helpers";

@Component({
  selector: "app-monitor-header",
  providers: [provideNativeDateAdapter()],
  encapsulation: ViewEncapsulation.None,
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

  driverBackendData = computed(() => {
    const backendData = this.backendService.backendData();
    const ddle = this.monitorService.driverDailyLog();

    if (!backendData || !ddle) return null;

    const tenantId = ddle.tenantId;
    const driverId = ddle.driverId;

    const driverNotes = backendData[0][tenantId]?.drivers[driverId]?.notes;
    const driverProblems = backendData[1][tenantId]?.drivers[driverId]?.notes;
    const driverMarker = backendData[4][tenantId]?.drivers[driverId]?.notes;
    const driverMarkColor = driverMarker
      ? Object.values(driverMarker)?.[0]?.[0]?.markerColor
      : null;

    const malf = backendData[3][tenantId]?.drivers[driverId]?.notes;
    let malfs: {
      start: string;
      end: string;
      note: string;
    }[] = [];
    if (malf) {
      for (let stamp in malf) {
        malfs.push(parseMalf(getNote(malf[stamp])));
      }
    }

    const companyNotes = backendData[0][tenantId]?.companyNotes;
    const companyMarker = backendData[4][tenantId]?.companyNotes;
    const companyMarkColor = companyMarker
      ? Object.values(companyMarker)?.[0]?.[0]?.markerColor
      : null;

    return {
      noteCount: driverNotes ? Object.keys(driverNotes).length : 0,
      companyNoteCount: companyNotes ? Object.keys(companyNotes).length : 0,
      issueCount: driverProblems ? Object.keys(driverProblems).length : 0,
      driverMarkColor: driverMarker ? driverMarkColor : null,
      companyMarkColor: companyMarker ? companyMarkColor : null,
      malfs,
    };
  });

  formatTenantName = formatTenantName;

  malfDates = computed(() => {
    const data = this.driverBackendData();
    if (!data) return [{ startDateString: "", endDateString: "" }];

    const malfDates: { startDateString: string; endDateString: string }[] = [];
    data.malfs.forEach((malf) => {
      const malfDate = { startDateString: malf.start, endDateString: malf.end };
      malfDates.push(malfDate);
    });
    return malfDates;
  });

  isMalfDate(date: string) {
    let isMalfDate = false;

    const malfDates = this.malfDates();
    malfDates.forEach((malf) => {
      const startDate = new Date(malf.startDateString);
      const endDate = new Date(malf.endDateString);
      const cellDate = new Date(date);

      const normalizedCellDate = new Date(
        cellDate.getFullYear(),
        cellDate.getMonth(),
        cellDate.getDate(),
      ).getTime();

      const normalizedStartDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
      ).getTime();

      const normalizedEndDate = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
      ).getTime();

      if (
        normalizedCellDate >= normalizedStartDate &&
        normalizedCellDate <= normalizedEndDate
      ) {
        isMalfDate = true;
      }
    });

    return isMalfDate;
  }

  dateClass: MatCalendarCellClassFunction<Date> = (cellDate: Date, view) => {
    if (view !== "month") {
      return "";
    }

    const malfPeriods = this.malfDates();

    const normalizedCellDate = new Date(
      cellDate.getFullYear(),
      cellDate.getMonth(),
      cellDate.getDate(),
    ).getTime();

    for (const period of malfPeriods) {
      if (!period.startDateString || !period.endDateString) {
        continue;
      }

      const startDate = new Date(period.startDateString);
      const endDate = new Date(period.endDateString);

      const normalizedStartDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
      ).getTime();

      const normalizedEndDate = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
      ).getTime();

      if (
        normalizedCellDate >= normalizedStartDate &&
        normalizedCellDate <= normalizedEndDate
      ) {
        return "example-custom-date-class";
      }
    }

    // 5. If no period matched, return an empty string
    return "";
  };

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
