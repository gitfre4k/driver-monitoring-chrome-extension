import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';

import { Subscription } from 'rxjs';

import { ScanService } from '../../services/scan.service';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';

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

  readonly range = new FormGroup({
    dateFrom: new FormControl<Date>(
      new Date(
        new Date(new Date().setHours(0, 0, 0, 0) - 7 * 24 * 60 * 60 * 1000)
      )
    ),
    dateTo: new FormControl<Date>(new Date(new Date().setHours(0, 0, 0, 0)), {
      nonNullable: true,
    }),
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

  getAllViolations = () => {
    const from = this.range.value.dateFrom;
    const to = this.range.value.dateTo;

    if (!from || !to) return;

    const dateFrom = new Date(new Date(from.getTime()).setHours(24) - 1);
    const dateTo = new Date(new Date(to.getTime()).setHours(24) - 1);
    console.log(dateFrom.toJSON(), dateTo.toJSON());

    this.scanSubscribtion = this.scanService
      .getAllViolations({ dateFrom, dateTo })
      .subscribe({
        next: (violations) => {
          this.scanService.handleViolations(violations);
        },
        error: (error) => {
          this.scanService.handleError(error);
        },
        complete: () => {
          this.scanService.handleViolationsComplete();
        },
      });
  };

  getAllDOTInspections = () => {
    const from = this.range.value.dateFrom;
    const to = this.range.value.dateTo;

    if (!from || !to) return;

    const dateFrom = new Date(new Date(from.getTime()).setHours(24));
    const dateTo = new Date(new Date(to.getTime()).setHours(24));

    this.scanSubscribtion = this.scanService
      .getAllDotInspections({ dateFrom, dateTo })
      .subscribe({
        next: (inspection) => {
          this.scanService.handleDOTInspections(inspection);
        },
        error: (error) => {
          this.scanService.handleError(error);
        },
        complete: () => {
          this.scanService.handleDOTComplete();
        },
      });
  };

  startScan = () => {
    if (this.scanMode.value === 'violations') this.getAllViolations();
    if (this.scanMode.value === 'dot') this.getAllDOTInspections();
    return;
  };
}
