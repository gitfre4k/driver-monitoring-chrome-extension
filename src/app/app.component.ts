import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';

import { ScanComponent } from './components/scan/scan.component';
import { MonitorComponent } from './components/monitor/monitor.component';
import { ProgressBarService } from './@services/progress-bar.service';
import { InfoComponent } from './components/info/info.component';
import { ScanResultComponent } from './components/scan-result/scan-result.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatTabsModule,
    MatIconModule,
    MatTooltipModule,
    ScanComponent,
    MonitorComponent,
    InfoComponent,
    ScanResultComponent,
    MatBadgeModule,
  ],
})
export class AppComponent {
  title = 'driver-monitoring-chrome-extension';

  private progressBarService = inject(ProgressBarService);

  scanning = this.progressBarService.scanning;
  violationsCount = this.progressBarService.totalCount;

  constructor() {}

  popUp() {
    const windowFeatures = `width=460,height=640,left=100000,top=0`;
    window.open('index.html', '', windowFeatures);
    window.close();
  }
}
