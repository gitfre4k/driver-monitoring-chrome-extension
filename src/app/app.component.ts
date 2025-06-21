import { Component, HostListener, inject, signal } from '@angular/core';
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
import { AppService } from './@services/app.service';
import { ExtensionTabNavigationService } from './@services/extension-tab-navigation.service';

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

  @HostListener('window:keydown', ['$event'])
  handleWindowKeyboardEvent(event: KeyboardEvent) {
    this.handleKeyboardEvent(event);
  }
  private extensionTabNavigationService = inject(ExtensionTabNavigationService);
  private progressBarService = inject(ProgressBarService);

  selectedTabIndex = this.extensionTabNavigationService.selectedTabIndex;
  scanning = this.progressBarService.scanning;
  violationsCount = this.progressBarService.totalVCount;

  constructor() {}

  private handleKeyboardEvent(event: KeyboardEvent) {
    console.log('Key pressed:', event.key, 'Code:', event.code);

    switch (event.key) {
      case '1':
        //  if (event.ctrlKey) console.log('Ctrl + 1 pressed!');
        this.extensionTabNavigationService.selectedTabIndex.set(0);
        event.preventDefault(); // Prevent default browser behavior
        break;
      case '2':
        this.extensionTabNavigationService.selectedTabIndex.set(1);
        event.preventDefault();
        break;
      case '3':
        this.extensionTabNavigationService.selectedTabIndex.set(2);
        event.preventDefault();
        break;
      case '4':
        this.extensionTabNavigationService.selectedTabIndex.set(3);
        event.preventDefault();
        break;
      default:
        // console.log(`${event.key} pressed`);
        break;
    }
  }

  popUp() {
    const windowFeatures = `width=336,height=640,left=100000,top=0`;
    window.open('index.html', '', windowFeatures);
    window.close();
  }
}
