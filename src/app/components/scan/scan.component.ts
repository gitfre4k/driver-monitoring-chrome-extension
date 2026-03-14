import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { Observable, Subscription, tap } from 'rxjs';

import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import {
  MatDatepickerInputEvent,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ScanService } from '../../@services/scan.service';
import { AdvancedScanComponent } from '../advanced-scan/advanced-scan.component';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';

import {
  FormControl,
  ReactiveFormsModule,
  FormsModule,
  FormGroup,
} from '@angular/forms';
import {
  ICertStatusDriver,
  IDOTInspections,
  IViolations,
} from '../../interfaces';
import { TScanMode } from '../../types';
import { AdvancedScanService } from '../../@services/advanced-scan.service';
import { ProgressBarService } from '../../@services/progress-bar.service';
import { ReportComponent } from '../report/report.component';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DateService } from '../../@services/date.service';
import { DateTime } from 'luxon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { MatBadgeModule } from '@angular/material/badge';

import { IDriverLogs } from '../../interfaces/daily-log.interface';
import { CertificationsScanService } from '../../@services/certifications-scan.service';
import { AppService } from '../../@services/app.service';
import { UnidentifiedEventsService } from '../../@services/unidentified-events.service';
import { AdminPortalService } from '../../@services/admin-portal.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaskQueueService } from '../../@services/task-queue.service';
import { GlobalSmartfFixService } from '../../@services/global-smartf-fix.service';

@Component({
  selector: 'app-scan',
  imports: [
    CommonModule,
    MatButtonModule,
    MatButtonToggleModule,
    ProgressBarComponent,
    MatDatepickerModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    FormsModule,
    MatSelectModule,
    MatIconModule,
    MatInputModule,
    AdvancedScanComponent,
    MatTooltipModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatSliderModule,
    MatBadgeModule,
  ],
  templateUrl: './scan.component.html',
  providers: [provideNativeDateAdapter()],
  styleUrl: './scan.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanComponent {
  scanService: ScanService = inject(ScanService);
  dateService = inject(DateService);
  progressBarService = inject(ProgressBarService);
  certScanService = inject(CertificationsScanService);
  appService = inject(AppService);
  unidentifiedEventsService = inject(UnidentifiedEventsService);
  adminPortalsService = inject(AdminPortalService);
  taskQueueServoce = inject(TaskQueueService);
  globalSmartfFixService = inject(GlobalSmartfFixService);
  advancedScanService = inject(AdvancedScanService);
  private destroyRef = inject(DestroyRef);
  readonly dialog = inject(MatDialog);
  private _snackBar = inject(MatSnackBar);

  // Analyze Date
  date = new FormControl<Date>(
    DateTime.fromISO(this.dateService.analyzeDate).toJSDate(),
  );
  analyzeDate = signal(
    this.date.value
      ? this.dateService.analyzeCustomDate(this.date.value)
      : this.dateService.analyzeDate,
  );

  // DOT Date
  date2 = new FormControl<Date>(
    DateTime.fromISO(this.dateService.fmcsaRange().from).toJSDate(),
  );
  dotDate = signal(this.dateService.fmcsaRange());

  // Range Date
  range = new FormGroup({
    end: new FormControl<Date>(DateTime.now().toJSDate()),
    start: new FormControl<Date>(DateTime.now().minus({ days: 7 }).toJSDate()),
  });
  updateRangeTrigger = signal(0);
  dateRange = computed(() => {
    const {
      violationsToday,
      violationsSevenDaysAgo,
      violationsMonthAgo,
      violationsRange,
    } = this.dateService;
    let dateFrom: string;
    let dateTo = violationsToday;
    const { from, to } = violationsRange(
      this.range.value.start!,
      this.range.value.end!,
    );
    this.updateRangeTrigger();
    switch (this.scanService.selectedRange()) {
      case 'custom':
        dateFrom = this.range.value.start ? from : violationsSevenDaysAgo;
        dateTo = this.range.value.end ? to : violationsToday;
        break;
      case 'month':
        dateFrom = violationsMonthAgo;
        break;
      default:
        dateFrom = violationsSevenDaysAgo;
        dateTo = violationsToday;
    }

    return { dateFrom, dateTo };
  });

  readonly scanMode = new FormControl<TScanMode>('violations', {
    nonNullable: true,
  });

  disableScan = false;
  clientTimeZone = DateTime.local().zoneName;
  scanSubscribtion = new Subscription();
  scanning = this.progressBarService.scanning;
  vLastSync = this.progressBarService.violationsLastSync;

  constructor() {
    console.log();
  }

  ngOnInit() {
    this.destroyRef.onDestroy(() => this.scanSubscribtion.unsubscribe());
  }

  changeDate(ev: MatDatepickerInputEvent<Date>) {
    console.log('change date => ', ev.value);
    console.log(
      'change date ISO UTC => ',
      DateTime.fromJSDate(ev.value!).toUTC().toISO(),
    );
    console.log(
      "change now startOf 'day' ISO UTC => ",
      DateTime.now().startOf('day').toUTC().toISO(),
    );
    this.analyzeDate.set(this.dateService.analyzeCustomDate(ev.value!));
  }
  changeDOTDate(ev: MatDatepickerInputEvent<Date>) {
    this.dotDate.set(this.dateService.fmcsaCustomRange(ev.value!));
  }
  updateRange() {
    this.updateRangeTrigger.update((prev) => prev + 1);
  }
  onRadioChange() {
    const value = this.scanService.selectedRange();
    if (value === 'custom') return;

    const { violationsToday, violationsSevenDaysAgo, violationsMonthAgo } =
      this.dateService;
    this.range.setValue({
      start:
        value === 'week'
          ? DateTime.now().endOf('day').minus({ days: 7 }).toJSDate()
          : DateTime.now().endOf('day').minus({ months: 1 }).toJSDate(),
      end: DateTime.now().endOf('day').toJSDate(),
    });
  }

  handleAdvancedScanComplete() {
    const dialogRef = this.dialog.open(ReportComponent);
    let instance = dialogRef.componentInstance;
    instance.analyzeError = this.progressBarService.aErrors();

    dialogRef
      .afterClosed()
      .subscribe(() => this.progressBarService.initializeProgressBar());
  }

  handleDriverLogs(driverLogs: IDriverLogs) {
    let certifiedLogsCount = 0;
    const logs = driverLogs.items;
    const driverName = driverLogs.driverName;
    const company = driverLogs.tenant.name;
    console.log('logs ', logs);
    logs.forEach((log) => log.certified && certifiedLogsCount++);
    console.log(`## [${company}] ${driverName}`);
    console.log(`certified Logs Count: ${certifiedLogsCount}`);
    console.log('`````````````````````````````````````````````````````');

    this.progressBarService.certStatus.update((prev) => {
      const newValue = { ...prev };

      const certStatusDriver: ICertStatusDriver = {
        driverName: driverLogs.driverName,
        driverId: driverLogs.driverId,
        uncertifiedDays: driverLogs.items,
        zone: driverLogs.zone,
        tenant: driverLogs.tenant,
      };

      if (driverLogs.items.length) {
        if (newValue[driverLogs.tenant.name])
          newValue[driverLogs.tenant.name].push(certStatusDriver);
        else newValue[driverLogs.tenant.name] = [certStatusDriver];
      }

      return newValue;
    });
  }

  startCertScan() {
    this.scanMode.setValue('cert');
    this.startScan();
  }
  startViolationsScan = () => {
    this.scanMode.setValue('violations');
    this.startScan();
  };
  startDOTScan = () => {
    this.scanMode.setValue('dot');
    this.startScan();
  };
  analyzeDriverLogs = () => {
    this.scanMode.setValue('advanced');
    this.startScan();
  };
  getPreViolationAlert() {
    this.scanMode.setValue('pre');
    this.startScan();
  }

  getDashboardLocationsData() {
    this.scanMode.setValue('admin');
    this.startScan();
  }

  deleteUnidentifiedEvents() {
    this.scanMode.setValue('deleteUE');
    this.scanSubscribtion = this.unidentifiedEventsService
      .deleteAllUnidentifiedEvents$()
      .subscribe({
        complete: () => {
          this.progressBarService.initializeProgressBar();
          this.scanMode.setValue('violations');
        },
      });
  }

  globalSmartFix() {
    this.scanMode.setValue('smartFix');
    this.scanSubscribtion = this.globalSmartfFixService
      .initiateGlobalSmartFix()
      .subscribe({
        complete: () => {
          this.progressBarService.initializeProgressBar();
          this.scanMode.setValue('violations');
        },
      });
  }

  startScan = () => {
    this.disableScan = true;
    setTimeout(() => (this.disableScan = false), 300);

    this.taskQueueServoce.addPendingTask(this.scanMode.value);

    switch (this.scanMode.value) {
      // Admin Portal
      case 'admin':
        this.scanSubscribtion = this.adminPortalsService
          .scanAdminPortal()
          .subscribe({
            error: (err) =>
              this._snackBar
                .open(`An error occurred: ${err.message}`, 'Close', {
                  duration: 3000,
                })
                .afterDismissed()
                .pipe(
                  tap(() => this.progressBarService.initializeProgressBar()),
                )
                .subscribe(),
            complete: () => {
              console.log(this.progressBarService.adminPortalResults());
              this.progressBarService.initializeProgressBar();
              this.scanMode.setValue('violations');
              this._snackBar.open(
                `Admin Portal scan complete. Results are avaiable in Report tab.`,
                'OK',
                {
                  duration: 3000,
                },
              );
            },
          });
        return;

      // Analyze Driver Logs
      case 'advanced':
        const date = this.analyzeDate();
        if (!date) {
          return;
        }
        this.scanSubscribtion = this.advancedScanService
          .getDriversDailyLogs(date)
          .subscribe({
            complete: () => this.handleAdvancedScanComplete(),
          });
        return;

      // pre-Violation || low Cycle alert
      case 'pre':
        this.scanSubscribtion = this.scanService
          .getPreViolationAlert()
          .subscribe({
            next: (company) => this.scanService.handlePreScanData(company),
            error: (err) => this.scanService.handleError(err),
            complete: () =>
              this.scanService.handleScanComplete(this.scanMode.value),
          });
        return;

      // Driver Certifications
      case 'cert':
        this.scanSubscribtion = this.certScanService.driverLogs$.subscribe({
          next: (driverLogs) => this.handleDriverLogs(driverLogs),
          error: (err) => this.scanService.handleError(err),
          complete: () =>
            this.scanService.handleScanComplete(this.scanMode.value),
        });
        return;

      // Violations || DOT Inspections
      case 'dot':
      case 'violations':
        const { dateFrom, dateTo } = this.dateRange();
        const dotDate = this.dotDate();
        if (!dateFrom || !dateTo || !dotDate) {
          return;
        }
        this.scanSubscribtion = (
          this.scanMode.value === 'violations'
            ? this.scanService.getAllViolations({ from: dateFrom, to: dateTo })
            : (this.scanService.getAllDOTInspections(
                dotDate,
              ) as Observable<any>)
        ).subscribe({
          next: (data: IViolations[] | IDOTInspections[]) =>
            this.scanService.handleScanData(data, this.scanMode.value),
          error: (err) => this.scanService.handleError(err),
          complete: () =>
            this.scanService.handleScanComplete(this.scanMode.value),
        });
        return;
      default:
        return;
    }
  };
}
