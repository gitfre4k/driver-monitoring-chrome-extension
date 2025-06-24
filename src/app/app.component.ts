import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DateTime } from 'luxon';

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
import { ExtensionTabNavigationService } from './@services/extension-tab-navigation.service';
import { interval, Subscription } from 'rxjs';
import { ScanService } from './@services/scan.service';
import { FormattedDateService } from './@services/formatted-date.service';
import { IViolations } from './interfaces';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MonthlyUsageScanComponent } from './components/monthly-usage-scan/monthly-usage-scan.component';

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
    MonthlyUsageScanComponent,
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
  private scanService = inject(ScanService);
  private formattedDateService = inject(FormattedDateService);
  private _snackBar = inject(MatSnackBar);

  private currentDate = new Date(
    this.formattedDateService.getFormatedDates().currentDate
  );
  private sevenDaysAgo = new Date(
    this.formattedDateService.getFormatedDates().sevenDaysAgo
  );

  selectedTabIndex = this.extensionTabNavigationService.selectedTabIndex;
  scanning = this.progressBarService.scanning;
  violationsCount = this.progressBarService.totalVCount;

  isPopup = false;

  timerSub!: Subscription;

  constructor() {}

  ngOnInit(): void {
    if (typeof chrome !== 'undefined' && chrome.extension) {
      const views = chrome.extension.getViews({ type: 'popup' });
      this.isPopup = views.some((view) => view === window);
    }

    this.timerSub = interval(300000).subscribe({
      next: () => {
        if (!this.scanning()) {
          this._snackBar.open(`Initiating violations auto-scan`, 'OK', {
            duration: 3000,
          });
          return this.scanService
            .getAllViolations({
              dateFrom: new Date(
                new Date(this.sevenDaysAgo.getTime()).toUTCString()
              ),
              dateTo: new Date(
                new Date(this.currentDate.getTime()).toUTCString()
              ),
            })
            .subscribe({
              next: (data: IViolations) =>
                this.scanService.handleScanData(data, 'violations'),
              error: (err) => this.scanService.handleError(err),
              complete: () => this.scanService.handleScanComplete('violations'),
            });
        } else
          return this._snackBar.open(`Violations auto-scan skiped`, 'OK', {
            duration: 3000,
          });
      },
    });
  }

  ngAfterViewInit() {
    if (this.isPopup) this.popUp();
  }

  ngOnDestroy(): void {
    if (this.timerSub) {
      this.timerSub.unsubscribe();
    }
  }

  private handleKeyboardEvent(event: KeyboardEvent) {
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
        break;
    }
  }

  changeSelectedIndex(i: number) {
    this.extensionTabNavigationService.selectedTabIndex.set(i);
  }

  popUp() {
    const windowFeatures = `width=397,height=640,left=100000,top=0`;
    window.open('index.html', '', windowFeatures);
    window.close();
  }
}
