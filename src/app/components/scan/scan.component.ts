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
  ],
  templateUrl: './scan.component.html',
  providers: [provideNativeDateAdapter()],
  styleUrl: './scan.component.scss',
})
export class ScanComponent {
  scanService: ScanService = inject(ScanService);
  dateService = inject(DateService);

  private destroyRef = inject(DestroyRef);
  private advancedScanService = inject(AdvancedScanService);
  private progressBarService = inject(ProgressBarService);

  readonly dialog = inject(MatDialog);

  date = new FormControl<Date>(this.dateService.today);
  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  selectedValue = signal<'Violations' | 'DOT Inspections'>('Violations');
  updateRangeTrigger = signal(0);
  dateRange = computed(() => {
    let dateFrom: Date;
    let dateTo = this.dateService.today;
    this.updateRangeTrigger();
    switch (this.scanService.selectedRange()) {
      case 'custom':
        dateFrom = this.range.value.start
          ? this.dateService.getQueryDate(this.range.value.start)
          : this.dateService.sevenDaysAgo;
        dateTo = this.range.value.end
          ? this.dateService.getQueryDate(this.range.value.end)
          : this.dateService.today;
        break;
      case 'month':
        dateFrom = this.dateService.monthAgo;
        break;
      default:
        dateFrom = this.dateService.sevenDaysAgo;
        dateTo = this.dateService.today;
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

  changeDate(ev: MatDatepickerInputEvent<Date>) {
    this.date.setValue(this.dateService.getQueryDate(ev.value!));
  }
  updateRange() {
    this.updateRangeTrigger.update((prev) => prev + 1);
  }

  handleAdvancedScanComplete() {
    const dialogRef = this.dialog.open(ReportComponent);
    let instance = dialogRef.componentInstance;
    instance.advancedScanResults = this.progressBarService.advancedResaults;

    dialogRef
      .afterClosed()
      .subscribe(() => this.progressBarService.initializeProgressBar());
  }

  startViolationsScan = () => {
    this.scanMode.setValue('violations');
    this.startScan();
  };

  analyzeDriverLogs = () => {
    this.scanMode.setValue('advanced');
    this.startScan();
  };

  startScan = () => {
    this.disableScan = true;
    const { dateFrom, dateTo } = this.dateRange();
    if (!dateFrom || !dateTo) {
      this.disableScan = false;
      return;
    }

    if (this.scanMode.value === 'advanced') {
      this.scanSubscribtion = this.advancedScanService
        .getLogs(dateTo)
        .subscribe({
          complete: () => this.handleAdvancedScanComplete(),
        });
    } else {
      this.scanSubscribtion = (
        this.scanMode.value === 'violations'
          ? this.scanService.getAllViolations({ dateFrom, dateTo })
          : (this.scanService.getAllDOTInspections({
              dateFrom,
              dateTo,
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
