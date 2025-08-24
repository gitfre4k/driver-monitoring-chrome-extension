import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Observable, Subscription } from 'rxjs';

import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import {
  MatDatepickerInputEvent,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

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
import { FindEventService } from '../../@services/find-event.service';
import { AppService } from '../../@services/app.service';

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
})
export class ScanComponent {
  scanService: ScanService = inject(ScanService);
  dateService = inject(DateService);
  progressBarService = inject(ProgressBarService);
  certScanService = inject(CertificationsScanService);
  findEventService = inject(FindEventService);
  appService = inject(AppService);
  private advancedScanService = inject(AdvancedScanService);
  private destroyRef = inject(DestroyRef);
  readonly dialog = inject(MatDialog);

  isLoading = this.appService.isLoading;

  // Analyze Date
  date = new FormControl<Date>(
    DateTime.now().setZone('America/New_York').toJSDate()
  );
  analyzeDate = signal(this.dateService.today);

  // DOT Date
  date2 = new FormControl<Date>(DateTime.now().startOf('day').toJSDate());
  dotDate = signal(
    this.dateService.getQueryDate(DateTime.now().startOf('day').toJSDate())
  );

  // Range Date
  range = new FormGroup({
    end: new FormControl<Date>(DateTime.now().toJSDate()),
    start: new FormControl<Date>(DateTime.now().minus({ days: 7 }).toJSDate()),
  });
  updateRangeTrigger = signal(0);
  dateRange = computed(() => {
    const { today, sevenDaysAgo, monthAgo, getQueryDate } = this.dateService;
    let dateFrom: Date;
    let dateTo = today;
    this.updateRangeTrigger();
    switch (this.scanService.selectedRange()) {
      case 'custom':
        dateFrom = this.range.value.start
          ? getQueryDate(this.range.value.start)!
          : sevenDaysAgo;
        dateTo = this.range.value.end
          ? getQueryDate(this.range.value.end)!
          : today;
        break;
      case 'month':
        dateFrom = monthAgo;
        break;
      default:
        dateFrom = sevenDaysAgo;
        dateTo = today;
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
    this.analyzeDate.set(this.dateService.getAnalyzeQueryDate(ev.value!)!);
  }
  changeDOTDate(ev: MatDatepickerInputEvent<Date>) {
    this.dotDate.set(this.dateService.getDOTQueryDate(ev.value!));
  }
  updateRange() {
    this.updateRangeTrigger.update((prev) => prev + 1);
  }
  onRadioChange() {
    const value = this.scanService.selectedRange();
    if (value === 'custom') return;

    const { todayLocal, sevenDaysAgoLocal, monthAgoLocal } = this.dateService;
    this.range.setValue({
      start: value === 'week' ? sevenDaysAgoLocal : monthAgoLocal,
      end: todayLocal,
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
  startAllScan() {}

  // getShomiLatLong() {
  //   this.findEventService.getLataLonga();
  // }

  show = () => {
    // console.log(this.appService.appDataSignal());
  };

  startScan = () => {
    this.disableScan = true;
    setTimeout(() => (this.disableScan = false), 2000);

    switch (this.scanMode.value) {
      // Analyze Driver Logs
      case 'advanced':
        const date = this.analyzeDate();
        if (!date) {
          return;
        }
        this.scanSubscribtion = this.advancedScanService
          .getLogs(date)
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
            ? this.scanService.getAllViolations({ dateFrom, dateTo })
            : (this.scanService.getAllDOTInspections({
                dateFrom: dotDate,
                dateTo: dotDate,
              }) as Observable<any>)
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
