import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { AdvancedScanService } from '../../services/advanced-scan.service';
import { ProgressBarService } from '../../services/progress-bar.service';

@Component({
  selector: 'app-advanced-scan',
  imports: [CommonModule, MatSliderModule, FormsModule, MatButtonModule],
  templateUrl: './advanced-scan.component.html',
  styleUrl: './advanced-scan.component.scss',
})
export class AdvancedScanComponent {
  private advancedScanService = inject(AdvancedScanService);
  private progressBarService = inject(ProgressBarService);

  readonly sliderValue = this.advancedScanService.sliderValue;
  readonly currentCompany = this.progressBarService.currentCompany;
  readonly progress = this.progressBarService.progressValue;

  readonly detectedOnDuties =
    this.progressBarService.advancedResaults.prolengedOnDuties;
  readonly malfOrDataDiagDetection =
    this.progressBarService.advancedResaults.malfOrDataDiagDetection;

  // getLogs() {
  //   this.advancedScanService.getLogs().subscribe();
  // }
}
