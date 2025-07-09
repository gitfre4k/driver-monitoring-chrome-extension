import { Component, computed, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Observable, Subscription } from 'rxjs';

import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { ScanService } from '../../@services/scan.service';
import { AdvancedScanComponent } from '../advanced-scan/advanced-scan.component';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';

import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IDOTInspections, IViolations } from '../../interfaces';
import { TScanMode } from '../../types';
import { AdvancedScanService } from '../../@services/advanced-scan.service';
import { ProgressBarService } from '../../@services/progress-bar.service';
import { ReportComponent } from '../report/report.component';
import { MatDialog } from '@angular/material/dialog';
import { DateTime } from 'luxon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

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

  private destroyRef = inject(DestroyRef);
  private advancedScanService = inject(AdvancedScanService);
  private progressBarService = inject(ProgressBarService);

  readonly dialog = inject(MatDialog);

  private currentDate = DateTime.now().toJSDate();
  private sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();
  private monthAgo = DateTime.now().minus({ months: 1 }).toJSDate();

  dateRange = computed(() =>
    this.scanService.selectedRange() === 'week'
      ? { dateFrom: this.sevenDaysAgo, dateTo: this.currentDate }
      : { dateFrom: this.monthAgo, dateTo: this.currentDate }
  );

  readonly scanMode = new FormControl<TScanMode>('advanced', {
    nonNullable: true,
  });

  disableScan = false;
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
    const { dateFrom: from, dateTo: to } = this.dateRange();
    if (!from || !to) {
      this.disableScan = false;
      return;
    }
    const range = {
      dateFrom: DateTime.fromJSDate(
        this.scanMode.value === 'violations' ? from : to
      )
        .endOf('day')
        .toUTC()
        .toJSDate(),
      dateTo: DateTime.fromJSDate(to).endOf('day').toUTC().toJSDate(),
    };

    console.log('[Scan Component] dateFrom: ');
    console.log(
      '[Scan Component]',
      DateTime.fromJSDate(from).endOf('day').toUTC().toJSDate().toISOString()
    );
    console.log('[Scan Component] dateTo: ');
    console.log(
      '[Scan Component]',
      DateTime.fromJSDate(to).endOf('day').toUTC().toJSDate().toISOString()
    );

    if (this.scanMode.value === 'advanced') {
      this.scanSubscribtion = this.advancedScanService
        .getLogs(range.dateTo)
        .subscribe({
          complete: () => {
            this.handleAdvancedScanComplete();
          },
        });
    } else {
      this.scanSubscribtion = (
        this.scanMode.value === 'violations'
          ? this.scanService.getAllViolations(range)
          : (this.scanService.getAllDOTInspections(range) as Observable<any>)
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
