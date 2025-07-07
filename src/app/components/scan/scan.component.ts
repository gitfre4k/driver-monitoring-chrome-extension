import { Component, DestroyRef, inject, signal } from '@angular/core';
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

import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { IDOTInspections, IViolations } from '../../interfaces';
import { FormattedDateService } from '../../@services/formatted-date.service';
import { TScanMode } from '../../types';
import { AdvancedScanService } from '../../@services/advanced-scan.service';
import { ProgressBarService } from '../../@services/progress-bar.service';
import { ReportComponent } from '../report/report.component';
import { MatDialog } from '@angular/material/dialog';
import { DateTime } from 'luxon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';

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
  ],
  templateUrl: './scan.component.html',
  providers: [provideNativeDateAdapter()],
  styleUrl: './scan.component.scss',
})
export class ScanComponent {
  private scanService: ScanService = inject(ScanService);
  private formattedDateService = inject(FormattedDateService);
  private destroyRef = inject(DestroyRef);
  private advancedScanService = inject(AdvancedScanService);
  private progressBarService = inject(ProgressBarService);

  readonly dialog = inject(MatDialog);

  private currentDate =
    this.formattedDateService.getFormatedDates().currentDate;
  private sevenDaysAgo =
    this.formattedDateService.getFormatedDates().sevenDaysAgo;

  readonly scanMode = new FormControl<TScanMode>('advanced', {
    nonNullable: true,
  });
  readonly range = new FormGroup({
    dateFrom: new FormControl<Date>(new Date(this.sevenDaysAgo)),
    dateTo: new FormControl<Date>(new Date(this.currentDate)),
  });

  disableScan = false;
  scanModes: { value: TScanMode; label: string; id: number }[] = [
    { value: 'violations', label: 'Violations', id: 1 },
    { value: 'dot', label: 'DOT Inspections', id: 2 },
    { value: 'advanced', label: 'Advanced', id: 3 },
  ];

  scanSubscribtion = new Subscription();
  scanning = this.progressBarService.scanning;

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

  startViolationsScan = () => {};

  startScan = () => {
    this.disableScan = true;
    const from = this.range.value.dateFrom;
    const to = this.range.value.dateTo;
    if (!from || !to) {
      this.disableScan = false;
      return;
    }
    console.log(
      '## [Scan Component] DateTime.fromJSDate(to).toUTC().toJSDate()'
    );
    console.log(DateTime.fromJSDate(to).toUTC().toJSDate());

    const range = {
      dateFrom: DateTime.fromJSDate(
        this.scanMode.value === 'violations' ? from : to
      )
        .toUTC()
        .toJSDate(),
      dateTo: DateTime.fromJSDate(to).toUTC().toJSDate(),
    };

    if (this.scanMode.value === 'advanced') {
      this.scanSubscribtion = this.advancedScanService.getLogs(to).subscribe({
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
