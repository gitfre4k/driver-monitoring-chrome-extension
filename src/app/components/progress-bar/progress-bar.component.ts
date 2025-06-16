import { Component, inject, Input } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';

import { Subscription } from 'rxjs';
import { TScanMode } from '../../types';
import { ProgressBarService } from '../../@services/progress-bar.service';

@Component({
  selector: 'app-progress-bar',
  imports: [MatCardModule, MatProgressBarModule, MatButtonModule],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss',
})
export class ProgressBarComponent {
  @Input({ required: true }) scanSubscription!: Subscription;
  @Input({ required: true }) scanMode!: TScanMode;

  private progressBarService = inject(ProgressBarService);

  scanning = this.progressBarService.scanning;
  errors = this.progressBarService.errors;
  value = this.progressBarService.progressValue;
  bufferValue = this.progressBarService.bufferValue;
  constant = this.progressBarService.constant;
  currentCompany = this.progressBarService.currentCompany;
  currentDriver = this.progressBarService.currentDriver;
  totalCount = this.progressBarService.totalCount;
  activeDriversCount = this.progressBarService.activeDriversCount;

  stopScan() {
    this.progressBarService.initializeState(this.scanMode);
    this.scanSubscription.unsubscribe();
  }
}
