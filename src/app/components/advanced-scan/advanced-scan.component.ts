import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { AdvancedScanService } from '../../services/advanced-scan.service';

@Component({
  selector: 'app-advanced-scan',
  imports: [CommonModule, MatSliderModule, FormsModule, MatButtonModule],
  templateUrl: './advanced-scan.component.html',
  styleUrl: './advanced-scan.component.scss',
})
export class AdvancedScanComponent {
  private advancedScanService = inject(AdvancedScanService);

  readonly currentCompany = this.advancedScanService.currentCompany;
  readonly sliderValue = this.advancedScanService.sliderValue;
  readonly progress = this.advancedScanService.progress;
  readonly detectedOnDuties = this.advancedScanService.detectedOnDuties;

  getLogs() {
    this.advancedScanService.getLogs().subscribe();
  }
}
