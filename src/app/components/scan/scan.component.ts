import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';

import { Observable, Subscription } from 'rxjs';

import { ScanService } from '../../services/scan.service';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { IDOTInspections, IViolations } from '../../interfaces';
import { FormattedDateService } from '../../web-app/formatted-date.service';

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
  ],
  templateUrl: './scan.component.html',
  providers: [provideNativeDateAdapter()],
  styleUrl: './scan.component.scss',
})
export class ScanComponent {
  private scanService: ScanService = inject(ScanService);
  private formattedDateService = inject(FormattedDateService);
  private destroyRef = inject(DestroyRef);

  private currentDate =
    this.formattedDateService.getFormatedDates().currentDate;
  private sevenDaysAgo =
    this.formattedDateService.getFormatedDates().sevenDaysAgo;

  readonly range = new FormGroup({
    dateFrom: new FormControl<Date>(new Date(this.sevenDaysAgo)),
    dateTo: new FormControl<Date>(new Date(this.currentDate)),
  });
  readonly scanMode = new FormControl<'violations' | 'dot'>('violations', {
    nonNullable: true,
  });

  scanSubscribtion = new Subscription();
  scanning = this.scanService.scanning;

  constructor() {}

  ngOnInit() {
    this.destroyRef.onDestroy(() => this.scanSubscribtion.unsubscribe());
  }

  startScan = () => {
    const from = this.range.value.dateFrom;
    const to = this.range.value.dateTo;
    if (!from || !to) return;

    const range = {
      dateFrom: new Date(new Date(from.getTime()).toUTCString()),
      dateTo: new Date(new Date(to.getTime()).toUTCString()),
    };

    console.log(range);

    this.scanSubscribtion = (
      this.scanMode.value === 'violations'
        ? this.scanService.getAllViolations(range)
        : (this.scanService.getAllDOTInspections(range) as Observable<any>)
    ).subscribe({
      next: (data: IViolations | IDOTInspections) =>
        this.scanService.handleScanData(data, this.scanMode.value),
      error: (err) => this.scanService.handleError(err),
      complete: () => this.scanService.handleScanComplete(this.scanMode.value),
    });
  };
}
