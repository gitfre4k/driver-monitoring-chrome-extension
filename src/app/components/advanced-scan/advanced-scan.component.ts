import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { AdvancedScanService } from '../../@services/advanced-scan.service';
import { ProgressBarService } from '../../@services/progress-bar.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-advanced-scan',
  imports: [
    CommonModule,
    MatSliderModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
  ],
  templateUrl: './advanced-scan.component.html',
  styleUrl: './advanced-scan.component.scss',
})
export class AdvancedScanComponent {
  private advancedScanService = inject(AdvancedScanService);
  private progressBarService = inject(ProgressBarService);

  readonly sliderValue = this.advancedScanService.prolongedOnDutiesDuration;
  readonly engineSliderValue = this.advancedScanService.engineHoursDuration;
  readonly lowTotalEngineHoursCount =
    this.advancedScanService.lowTotalEngineHoursCount;
  readonly ptiDurationSliderValue = this.advancedScanService.ptiDuration;

  readonly currentCompany = this.progressBarService.currentCompany;
  readonly progress = this.progressBarService.progressValue;

  readonly detectedOnDuties =
    this.progressBarService.advancedResaults.prolengedOnDuties;
  readonly malfOrDataDiagDetection =
    this.progressBarService.advancedResaults.malfOrDataDiagDetection;
}
