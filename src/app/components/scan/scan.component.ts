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
  private destroyRef = inject(DestroyRef);
  private date = new Date().setHours(0, 0, 0, 0);

  readonly range = new FormGroup({
    dateFrom: new FormControl<Date>(
      new Date(this.date - 7 * 24 * 60 * 60 * 1000)
    ),
    dateTo: new FormControl<Date>(new Date(this.date)),
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
      dateFrom: new Date(new Date(from.getTime()).setHours(24)),
      dateTo: new Date(new Date(to.getTime()).setHours(24)),
    };

    let isViolationsMode = this.scanMode.value === 'violations' ? true : false;

    this.scanSubscribtion = (
      isViolationsMode
        ? this.scanService.getAllViolations(range)
        : (this.scanService.getAllDOTInspections(range) as Observable<any>)
    ).subscribe({
      next: (data: IViolations | IDOTInspections) =>
        this.scanService.handleScanData(data),
      error: (err) => this.scanService.handleError(err),
      complete: () =>
        isViolationsMode
          ? this.scanService.handleViolationsComplete()
          : this.scanService.handleDOTComplete(),
    });
  };
}
