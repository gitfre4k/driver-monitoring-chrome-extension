import { Component, effect, inject, signal } from "@angular/core";
import { AppService } from "../../@services/app.service";
import { CommonModule, KeyValuePipe } from "@angular/common";
import { ApiService } from "../../@services/api.service";
import { IDriver, ITenant } from "../../interfaces";
import { MonitorService } from "../../@services/monitor.service";
import { DateAgoPipe } from "../../pipes/date-ago.pipe";
import { from, map, mergeMap, switchMap, tap } from "rxjs";
import { DateTime } from "luxon";
import { DateService } from "../../@services/date.service";
import { formatTenantName } from "../../helpers/monitor.helpers";
import { ConstantsService } from "../../@services/constants.service";
import { MatButtonModule } from "@angular/material/button";
import { ProgressBarService } from "../../@services/progress-bar.service";
import { MatIconModule } from "@angular/material/icon";
import { DialogAddNoteComponent } from "../UI/dialog-add-note/dialog-add-note.component";
import { MatDialog } from "@angular/material/dialog";
import { BackendService } from "../../@services/backend.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { IVehicle } from "../../interfaces/driver-daily-log-events.interface";

@Component({
  selector: "app-info",
  imports: [
    CommonModule,
    DateAgoPipe,
    MatButtonModule,
    MatIconModule,
    KeyValuePipe,
    MatProgressSpinnerModule,
  ],
  templateUrl: "./info.component.html",
  styleUrl: "./info.component.scss",
})
export class InfoComponent {
  appService = inject(AppService);
  apiService = inject(ApiService);
  monitorService = inject(MonitorService);
  dateService = inject(DateService);
  constService = inject(ConstantsService);
  progressBarService = inject(ProgressBarService);
  backendService = inject(BackendService);
  private _snackBar = inject(MatSnackBar);

  readonly dialog = inject(MatDialog);

  isDisabledElConejo = false;

  driver = signal<IDriver | null>(null);
  showGetLogInfo = true;

  constructor() {
    effect(() => {
      const driver = this.driver();
      const driverDailyLog = this.monitorService.driverDailyLog();

      if (!driver || !driverDailyLog) return (this.showGetLogInfo = true);
      else if (driver.id !== driverDailyLog.driverId) {
        return (this.showGetLogInfo = true);
      }

      return;
    });
  }

  backendData = () => {
    const backendData = this.backendService.backendData();
    const tenantId = this.appService.currentTenant()?.id;
    const driverId = this.monitorService.driverDailyLog()?.driverId;

    if (!backendData || !tenantId || !driverId) return null;

    const driverNotes = backendData[0][tenantId]?.drivers[driverId]?.notes;
    const problems = backendData[1][tenantId]?.drivers[driverId]?.notes;
    const fmscaInspections = backendData[2][tenantId]?.drivers[driverId]?.notes;

    return { driverNotes, problems, fmscaInspections };
  };

  hideInfo() {
    this.progressBarService.showInfo.set(false);
  }

  uploadData(
    title: string,
    eventTypeCode:
      | "ChangeToOffDutyStatus"
      | "ChangeToSleeperBerthStatus"
      | "ChangeToOnDutyNotDrivingStatus",
    vehicles?: IVehicle[],
  ) {
    const tenant = this.appService.currentTenant();
    const driver = this.monitorService.driverDailyLog();

    if (!tenant || !driver) return;

    const dialogRef = this.dialog.open(DialogAddNoteComponent, {
      data: {
        tenant,
        driver,
        eventTypeCode,
        title,
        vehicles,
      },
    });

    // dialogRef.afterClosed().subscribe((result) => {
    //   console.log("The dialog was closed");
    //   if (result !== undefined) {
    //     console.log("The dialog was closed");
    //   }
    // });
  }

  deleteNote(
    value: { note: string; part: number; eventId: number }[],
    key: string,
  ) {
    this.backendService.isDeletingNote.set(key);

    const idsToDelete = value.map((note) => note.eventId);

    this.backendService.deleteNote(idsToDelete).subscribe({
      error: () => {
        this._snackBar.open("Failed to delete note", "Close", {
          duration: 3000,
        });
        this.backendService.isDeletingNote.set(null);
      },
      complete: () => {
        this.backendService.isDeletingNote.set(null);
        this.backendService.loadShiftReport();
      },
    });
  }

  getLogs = () => {
    const t = this.appService.currentTenant();
    const d = this.monitorService.driverDailyLog();
    if (!t || !d) this.driver.set(null);
    else {
      this.apiService
        .getLogs(t, this.dateService.getLogsDateRange())
        .subscribe({
          next: (logs) => {
            const currentDriver = logs.items.find(
              (driver) => driver.id === d.driverId,
            );
            if (currentDriver) {
              this.driver.set(currentDriver);
              this.showGetLogInfo = false;
            } else {
              this.driver.set({
                companyId: 0,
                driverId: "error",
                driverStatus: "error",
                fullName: "error",
                hasViolations: false,
                homeTerminalTimeZone: "error",
                id: 0,
                lastSync: "error",
                mobileAppType: "error",
                mobileAppVersion: "error",
                tenant: { name: "error", id: "error" } as ITenant,
              });
              this.showGetLogInfo = false;
            }
          },
        });
    }
  };

  hideLogs() {
    this.driver.set(null);
    this.showGetLogInfo = false;
  }

  logActiveDriversPerCompany() {
    this.isDisabledElConejo = true;
    const logOutput: { [company: string]: number } = {};
    const qDate = DateTime.fromISO(this.dateService.analyzeDate).toJSDate();

    this.apiService
      .getAccessibleTenants()
      .pipe(
        switchMap((tenants) => from(tenants)),
        mergeMap((t) =>
          this.apiService
            .getLogs(t, this.dateService.getLogsCustomDateRange(qDate))
            .pipe(
              map((data) => {
                const logs = { ...data };
                logs.tenant = t;
                return logs;
              }),
            ),
        ),
        tap((logs) => {
          const companyName = formatTenantName(logs.tenant!.name);
          companyName !== "Dex Solutions" &&
            (logOutput[companyName] = logs.totalCount);
        }),
      )
      .subscribe({
        complete: () => {
          const entries = Object.entries(logOutput);

          entries.sort((a, b) => b[1] - a[1]);

          const groups: {
            [key: string]: { companies: string[]; total: number };
          } = {
            A: { companies: [], total: 0 },
            B: { companies: [], total: 0 },
            C: { companies: [], total: 0 },
          };

          const groupKeys = ["A", "B", "C"];

          entries.forEach(([companyName, value]) => {
            let minTotal = Infinity;
            let targetKey = groupKeys[0];

            for (const key of groupKeys) {
              if (groups[key].total < minTotal) {
                minTotal = groups[key].total;
                targetKey = key;
              }
            }

            groups[targetKey].companies.push(`${companyName} (${value})`);
            groups[targetKey].total += value;
          });

          this.isDisabledElConejo = false;
          return console.log(groups);
        },
        error: () => (this.isDisabledElConejo = false),
      });
  }
}
