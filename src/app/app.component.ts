import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ScanComponent } from './components/scan/scan.component';
import { ScanService } from './services/scan.service';
import { MonitorComponent } from './components/monitor/monitor.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [
    CommonModule,
    MatButtonModule,
    MatDividerModule,
    MatCardModule,
    MatListModule,
    MatTabsModule,
    MatIconModule,
    MatTooltipModule,
    ScanComponent,
    MonitorComponent,
  ],
})
export class AppComponent {
  title = 'driver-monitoring-chrome-extension';

  private scanService: ScanService = inject(ScanService);

  scanning = this.scanService.scanning;

  constructor() {}

  popUp() {
    var viewportwidth = document.documentElement.clientWidth;
    const windowFeatures = `width=436,height=640,left=100000,top=0`;
    window.open('index.html', '', windowFeatures);
    window.close();
  }
}

// mock
