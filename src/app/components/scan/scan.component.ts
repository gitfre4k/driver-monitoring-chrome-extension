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
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';

import {
  FormControl,
  ReactiveFormsModule,
  FormsModule,
  FormGroup,
} from '@angular/forms';
import { ICertStatusDriver, ITenant } from '../../interfaces';
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
import { NotificationService } from '../../@services/notification.service';
import { TaskQueueService } from '../../@services/task-queue.service';
import { GlobalSmartfFixService } from '../../@services/global-smartf-fix.service';
import { SelectAllDirective } from '../../directive/select-all.directive';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ScanErrorListComponent } from '../scan-error-list/scan-error-list.component';
import { DriverLogAnalysisComponent } from '../driver-log-analysis/driver-log-analysis.component';

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
    MatTooltipModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatSliderModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    SelectAllDirective,
    ScanErrorListComponent,
    DriverLogAnalysisComponent,
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
  taskQueueService = inject(TaskQueueService);
  globalSmartfFixService = inject(GlobalSmartfFixService);
  advancedScanService = inject(AdvancedScanService);
  private destroyRef = inject(DestroyRef);
  readonly dialog = inject(MatDialog);
  private notification = inject(NotificationService);

  /** Scan-queue tasks still waiting to run (the active one is shown in the
   *  progress bar), surfaced inline on the scan page. */
  pendingScans = computed(() =>
    this.taskQueueService.scan.tasks().filter((t) => t.status === 'pending'),
  );

  /** The scan currently running (its progress is shown in the progress bar). */
  processingScan = computed(() =>
    this.taskQueueService.scan.tasks().find((t) => t.status === 'processing'),
  );

  /** True while a violations scan is the one actively running. */
  violationsScanning = computed(() =>
    this.taskQueueService.scan
      .tasks()
      .some((t) => t.key === 'violations' && t.status === 'processing'),
  );

  /** Stop the running scan: cancel its queue task so the next queued scan
   *  starts automatically. */
  onScanStopped() {
    const active = this.processingScan();
    if (active) this.taskQueueService.scan.cancel(active.id);
  }

  /**
   * Queue state of a given scan card, used to drive its action button:
   * `idle` (normal label), `processing` (spinner + hover-to-cancel) or
   * `queued` (1-based position among pending scans, disabled).
   */
  scanTaskState(key: TScanMode): {
    status: 'idle' | 'queued' | 'processing';
    position: number;
    taskId: number | null;
  } {
    const tasks = this.taskQueueService.scan.tasks();
    const task = tasks.find(
      (t) =>
        t.key === key &&
        (t.status === 'pending' || t.status === 'processing'),
    );
    if (!task) return { status: 'idle', position: 0, taskId: null };
    if (task.status === 'processing')
      return { status: 'processing', position: 0, taskId: task.id };

    const position =
      tasks.filter((t) => t.status === 'pending').findIndex((t) => t.id === task.id) +
      1;
    return { status: 'queued', position, taskId: task.id };
  }

  /** Enqueue a scan task, de-duplicated by mode; warn if one is already queued. */
  private enqueueScan(
    label: string,
    work: () => Observable<unknown>,
    handlers: {
      next?: (value: any) => void;
      error?: (err: any) => void;
      complete?: () => void;
    },
    key: TScanMode,
  ) {
    const id = this.taskQueueService.scan.enqueue(label, work, handlers, {
      key,
      dedupe: true,
    });
    if (id === null)
      this.notification.warning(`${label} is already in progress.`);
    return id;
  }

  certTenants = new FormControl([] as ITenant[]);

  tenantList = this.appService.tenantsSignal;

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

  /** Tools card accordion state — collapsed by default, session-only. */
  toolsExpanded = signal(false);

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
        dateFrom = violationsMonthAgo;
        dateTo = violationsToday;
    }

    return { dateFrom, dateTo };
  });

  readonly scanMode = new FormControl<TScanMode>('violations', {
    nonNullable: true,
  });

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
    this.progressBarService.initializeProgressBar();

    // dialogRef
    //   .afterClosed()
    //   .subscribe(() => this.progressBarService.initializeProgressBar());
  }

  handleDriverLogs(driverLogs: IDriverLogs) {
    // let certifiedLogsCount = 0;
    // const logs = driverLogs.items;
    // const driverName = driverLogs.driverName;
    // const company = driverLogs.tenant.name;
    // console.log('logs ', logs);
    // logs.forEach((log) => log.certified && certifiedLogsCount++);
    // console.log(`## [${company}] ${driverName}`);
    // console.log(`certified Logs Count: ${certifiedLogsCount}`);
    // console.log('`````````````````````````````````````````````````````');

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

  handleLogCertification() {}

  startCertScan = () => {
    this.scanMode.setValue('cert');
    this.startScan();
  };
  certifyLogs = () => {
    this.scanMode.setValue('cert-logs');
    this.startScan();
  };
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
  getPreViolationAlert = () => {
    this.scanMode.setValue('pre');
    this.startScan();
  };

  getDashboardLocationsData = () => {
    this.scanMode.setValue('admin');
    this.startScan();
  };

  deleteUnidentifiedEvents = () => {
    this.scanMode.setValue('deleteUE');
    this.enqueueScan(
      'Delete Unidentified Events',
      () => this.unidentifiedEventsService.deleteAllUnidentifiedEvents$(),
      {
        complete: () => {
          this.progressBarService.initializeProgressBar();
          this.scanMode.setValue('violations');
        },
      },
      'deleteUE',
    );
  };

  globalSmartFix = () => {
    this.scanMode.setValue('smartFix');
    this.enqueueScan(
      'Global Smart Fix',
      () => this.globalSmartfFixService.initiateGlobalSmartFix(),
      {
        complete: () => {
          this.progressBarService.initializeProgressBar();
          this.scanMode.setValue('violations');
        },
      },
      'smartFix',
    );
  };

  scanLabel: { [key in TScanMode]?: string } = {
    admin: 'Admin Portal Scan',
    advanced: 'Advanced Scan',
    pre: 'Pre-Violation Scan',
    cert: 'Certifications Scan',
    'cert-logs': 'Log Certification',
    dot: 'DOT Inspections Scan',
    violations: 'Violations Scan',
  };

  startScan = () => {
    if (this.scanMode.value !== 'cert')
      this.progressBarService.certTenants.set([]);

    const label = this.scanLabel[this.scanMode.value] ?? this.scanMode.value;

    switch (this.scanMode.value) {
      // Admin Portal
      case 'admin':
        this.enqueueScan(
          label,
          () => this.adminPortalsService.scanAdminPortal(),
          {
            error: (err: any) =>
              this.notification
                .error(`An error occurred: ${err.message}`, {
                  action: 'Close',
                  duration: 3000,
                })
                .afterDismissed()
                .pipe(
                  tap(() => this.progressBarService.initializeProgressBar()),
                )
                .subscribe(),
            complete: () => {
              this.progressBarService.initializeProgressBar();
              this.scanMode.setValue('violations');
              this.notification.success(
                `Admin Portal scan complete. Results are avaiable in Report tab.`,
              );
            },
          },
          'admin',
        );
        return;

      // Analyze Driver Logs
      case 'advanced':
        const date = this.analyzeDate();
        if (!date) {
          return;
        }
        this.enqueueScan(
          label,
          () => this.advancedScanService.getDriversDailyLogs(date),
          {
            complete: () => this.handleAdvancedScanComplete(),
          },
          'advanced',
        );
        return;

      // pre-Violation || low Cycle alert
      case 'pre':
        this.scanService.enqueuePreScan() === null &&
          this.notification.warning(`${label} is already in progress.`);
        return;

      // Certifications Scan
      case 'cert':
        this.enqueueScan(
          label,
          () => this.certScanService.driverLogs$(),
          {
            next: (driverLogs: any) => this.handleDriverLogs(driverLogs),
            error: (err: any) => this.scanService.handleError(err),
            complete: () =>
              this.scanService.handleScanComplete(this.scanMode.value),
          },
          'cert',
        );
        return;

      // Log Certification
      case 'cert-logs':
        const certTenants = this.certTenants.value;
        if (!certTenants || !certTenants.length) {
          this.notification.warning('No company selected.', {
            action: 'Close',
            duration: 3000,
          });
          return;
        }

        this.enqueueScan(
          label,
          () => this.certScanService.driverLogs$(certTenants),
          {
            next: () => this.handleLogCertification(),
            error: (err: any) => this.scanService.handleError(err),
            complete: () => {
              this.notification.success(
                `Loc Certification completed. Certified days: ${this.certScanService.certifiedLogCount()}`,
                { duration: 4500 },
              );
              this.progressBarService.initializeProgressBar();
            },
          },
          'cert-logs',
        );

        return;

      // Violations || DOT Inspections
      case 'dot':
      case 'violations': {
        const { dateFrom, dateTo } = this.dateRange();
        const dotDate = this.dotDate();
        if (!dateFrom || !dateTo || !dotDate) {
          return;
        }
        const queued =
          this.scanMode.value === 'violations'
            ? this.scanService.enqueueViolationsScan({
                from: dateFrom,
                to: dateTo,
              })
            : this.scanService.enqueueDotScan(dotDate);
        if (queued === null)
          this.notification.warning(`${label} is already in progress.`);
        return;
      }
      default:
        return;
    }
  };
}
