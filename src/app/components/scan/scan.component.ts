import { Component, DestroyRef, inject } from '@angular/core';
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

  readonly scanMode = new FormControl<TScanMode>('violations', {
    nonNullable: true,
  });
  readonly range = new FormGroup({
    dateFrom: new FormControl<Date>(new Date(this.sevenDaysAgo)),
    dateTo: new FormControl<Date>(new Date(this.currentDate)),
  });

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

    dialogRef.afterClosed();
    // .subscribe(() => this.progressBarService.initializeState('advanced'));
  }

  startScan = () => {
    const from = this.range.value.dateFrom;
    const to = this.range.value.dateTo;
    if (!from || !to) return;

    const range = {
      dateFrom: new Date(
        new Date(
          (this.scanMode.value === 'violations' ? from : to).getTime()
        ).toUTCString()
      ),
      dateTo: new Date(new Date(to.getTime()).toUTCString()),
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
        next: (data: IViolations | IDOTInspections) =>
          this.scanService.handleScanData(data, this.scanMode.value),
        error: (err) => this.scanService.handleError(err, this.scanMode.value),
        complete: () =>
          this.scanService.handleScanComplete(this.scanMode.value),
      });
    }
  };
}
