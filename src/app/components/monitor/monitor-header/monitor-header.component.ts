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

  @Input() companyName = "";
  @Input() driverName = "";
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  @Input() nextLogDate: string | null = null;
  @Input() currentLogDate: Date | null = null;
  @Input() previousLogDate: string | null = null;
  @Output() changeLogDate = new EventEmitter<string>();

  private monitorService = inject(MonitorService);
  private extTabNavService = inject(ExtensionTabNavigationService);

  driverInfo = this.monitorService.driverInfo;
  isUpdating = this.monitorService.isUpdating;
  selectedTabIndex = this.extTabNavService.selectedTabIndex;
  datePicker = new FormControl<Date>(DateTime.now().toJSDate());

  formatTenantName = formatTenantName;

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
          if (this.previousLogDate) {
            this.onChangeLogDate(this.previousLogDate);
            event.preventDefault();
          }
          break;
        case "ArrowRight":
          if (this.nextLogDate) {
            this.onChangeLogDate(this.nextLogDate);
            event.preventDefault();
          }
          break;

        default:
          break;
      }
    }
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
