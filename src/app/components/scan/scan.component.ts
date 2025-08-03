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
import { IDOTInspections, IViolations } from '../../interfaces';
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
import { IDriverItem, IDrivers } from '../../interfaces/drivers.interface';
import { MatSliderModule } from '@angular/material/slider';

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
  ],
  templateUrl: './scan.component.html',
  providers: [provideNativeDateAdapter()],
  styleUrl: './scan.component.scss',
})
export class ScanComponent {
  scanService: ScanService = inject(ScanService);
  dateService = inject(DateService);
  progressBarService = inject(ProgressBarService);

  private destroyRef = inject(DestroyRef);
  private advancedScanService = inject(AdvancedScanService);

  readonly dialog = inject(MatDialog);

  // Analyze Date
  date = new FormControl<Date>(DateTime.now().toJSDate());
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

  readonly scanMode = new FormControl<TScanMode>('advanced', {
    nonNullable: true,
  });

  disableScan = false;
  clientTimeZone = DateTime.local().zoneName;
  scanModes: { value: TScanMode; label: string; id: number }[] = [
    { value: 'violations', label: 'Violations', id: 1 },
    { value: 'dot', label: 'DOT Inspections', id: 2 },
    { value: 'advanced', label: 'Advanced', id: 3 },
  ];

  scanSubscribtion = new Subscription();
  scanning = this.progressBarService.scanning;
  vLastSync = this.progressBarService.violationsLastSync;

  constructor() {}

  ngOnInit() {
    this.destroyRef.onDestroy(() => this.scanSubscribtion.unsubscribe());
  }

  getPreViolationAlert() {
    this.disableScan = true;
    setTimeout(() => (this.disableScan = false), 2000);
    this.scanService.getPreViolationAlert().subscribe({
      next: (company) => {
        company.forEach((driver) => {
          const items: IDriverItem[] = [];
          driver.items.forEach((item) => {
            const hos = item.hosTimers;
            if (['D', 'ON'].includes(item.driverDutyStatus)) {
              hos.shiftWork < this.progressBarService.preViolationsSlider() &&
                hos.shiftWork !== 0 &&
                (item.preViolationShiftWork = hos.shiftWork);
              hos.shiftDrive < this.progressBarService.preViolationsSlider() &&
                hos.shiftDrive !== 0 &&
                hos.shiftDrive !== hos.shiftWork &&
                (item.preViolationShiftDrive = hos.shiftDrive);
              hos.break < this.progressBarService.preViolationsSlider() &&
                hos.break !== 0 &&
                hos.break !== hos.shiftWork &&
                hos.break !== hos.shiftDrive &&
                (item.preViolationBreak = hos.break);
              (item.preViolationShiftDrive ||
                item.preViolationShiftWork ||
                item.preViolationBreak) &&
                items.push(item);
            }
          });
          const data: IDrivers = {
            tenant: driver.tenant,
            date: DateTime.fromJSDate(this.dateService.today).toUTC().toISO()!,
            totalCount: driver.totalCount,
            items,
          };
          items.length &&
            this.progressBarService.preViolations.update((prev) => {
              const newValue = { ...prev, [driver.tenant.name]: data };
              ///////////
              return newValue;
            });
        });
      },
    });
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
    instance.analyzeError = this.progressBarService.errors;

    dialogRef
      .afterClosed()
      .subscribe(() => this.progressBarService.initializeProgressBar());
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

  startScan = () => {
    this.disableScan = true;
    //////////////////////
    // Analyze Driver Logs
    if (this.scanMode.value === 'advanced') {
      const date = this.analyzeDate();
      if (!date) {
        this.disableScan = false;
        return;
      }
      this.scanSubscribtion = this.advancedScanService.getLogs(date).subscribe({
        complete: () => this.handleAdvancedScanComplete(),
      });
    }
    //////////////////////
    // Scan for Violations / DOT Inspections
    else {
      const { dateFrom, dateTo } = this.dateRange();
      const dotDate = this.dotDate();
      if (!dateFrom || !dateTo || !dotDate) {
        this.disableScan = false;
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
    }
    setTimeout(() => (this.disableScan = false), 2000);
  };
}
