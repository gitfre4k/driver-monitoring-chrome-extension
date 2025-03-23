import { Component, inject, Input, input } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';

import { ScanService } from '../../services/scan.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-progress-bar',
  imports: [MatCardModule, MatProgressBarModule, MatButtonModule],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss',
})
export class ProgressBarComponent {
  @Input({ required: true }) scanSubscription!: Subscription;

  private scanService: ScanService = inject(ScanService);

  scanning = this.scanService.scanning;
  progressBar = this.scanService.progressBar;
  errors = this.scanService.errors;

  stopScan() {
    this.scanService.initializeScanState();
    this.scanSubscription.unsubscribe();
  }
}
