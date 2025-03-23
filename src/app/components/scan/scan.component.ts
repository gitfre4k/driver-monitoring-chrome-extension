import {
  Component,
  DestroyRef,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
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
    start: new FormControl<Date>(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ),
    end: new FormControl<Date>(new Date()),
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
    this.scanSubscribtion = this.scanService.getAllViolations().subscribe({
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
    this.scanSubscribtion = this.scanService.getAllDotInspections().subscribe({
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
