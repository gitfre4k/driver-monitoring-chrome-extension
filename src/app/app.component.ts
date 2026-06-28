import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
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
import { ExtensionTabNavigationService } from './@services/extension-tab-navigation.service';
import { interval, Subscription } from 'rxjs';
import { ScanService } from './@services/scan.service';
import { DateService } from './@services/date.service';
import { ErrorsComponent } from './components/errors/errors.component';
import { SettingsComponent } from './components/settings/settings.component';
import { AppService } from './@services/app.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ConstantsService } from './@services/constants.service';
import { TaskQueueComponent } from './components/task-queue/task-queue.component';
import { ConsoleComponent } from './components/console/console.component';
import { NotificationService } from './@services/notification.service';
import { CloudComponent } from './components/cloud/cloud.component';
import { MonitorService } from './@services/monitor.service';
import { BackendService } from './@services/backend.service';
import { UrlService } from './@services/url.service';
import { ActiveDriverCountService } from './@services/active-driver-count.service';

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
    MatBadgeModule,
    ScanComponent,
    MonitorComponent,
    ErrorsComponent,
    InfoComponent,
    CloudComponent,
    ScanResultComponent,
    MatProgressSpinnerModule,
    TaskQueueComponent,
    ConsoleComponent,
    SettingsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'driver-monitoring-chrome-extension';

  @HostListener('window:keydown', ['$event'])
  handleWindowKeyboardEvent(event: KeyboardEvent) {
    this.handleKeyboardEvent(event);
  }

  private extensionTabNavigationService = inject(ExtensionTabNavigationService);
  private progressBarService = inject(ProgressBarService);
  private appService = inject(AppService);
  private scanService = inject(ScanService);
  monitorService = inject(MonitorService);
  private notification = inject(NotificationService);
  private dateService = inject(DateService);
  private constantsService = inject(ConstantsService);
  private backendService = inject(BackendService);
  private activeDriversService = inject(ActiveDriverCountService);
  urlService = inject(UrlService);

  private subscriptions: Subscription = new Subscription();

  activeDriverData = signal<{ [tenantName: string]: number }>({});

  selectedTabIndex = this.extensionTabNavigationService.selectedTabIndex;
  scanning = this.progressBarService.scanning;
  violationsCount = this.progressBarService.totalVCount;

  showErrors = this.progressBarService.showErrors;

  errCount = this.progressBarService.errorCount;

  isPopup = false;
  currentCounter: number = 0;
  currentOperationStatus: string = 'idle';

  timerSub!: Subscription;
  timerSub2!: Subscription;

  isLoading = this.appService.isLoading;
  initMode = this.appService.initMode;
  initPhase = this.appService.initPhase;
  initProgressValue = this.appService.initProgressValue;
  initCurrentTenant = this.appService.initCurrentTenant;

  constructor() {}

  logData() {
    this.activeDriversService.getDriversDailyLogs().subscribe({
      next: (log) =>
        this.activeDriverData.update((prev) => ({
          ...prev,
          [log.tenant.name]: log.totalCount,
        })),
      complete: () => this.handleLogogoog(),
    });
  }

  handleLogogoog() {
    console.log(this.activeDriverData());
    const activeDriverData = this.activeDriverData();

    let total = 0;

    const sortedTenants = Object.entries(activeDriverData).sort(
      (a, b) => b[1] - a[1],
    );

    sortedTenants.forEach(([name, amount], index) => {
      console.log(`${index + 1}. ${name}: ${amount}`);
      total += amount;
    });

    console.log('---');
    console.log(`total: ${total}`);
  }

  ngOnInit(): void {
    if (typeof chrome !== 'undefined' && chrome.extension) {
      const views = chrome.extension.getViews({ type: 'popup' });
      this.isPopup = views.some((view) => view === window);
    }

    /////////////
    // initialize app
    this.appService.initializeAppDevMode$().subscribe();
    // this.appService.initializeApp$().subscribe();

    ///////////////////////
    // active drivers count

    if (['Prologs', 'prologs'].includes(this.urlService.provider())) {
      // Auto-loadShiftReport()
      this.timerSub = interval(300000).subscribe({
        next: () => this.backendService.loadShiftReport(),
      });

      // Auto-loadArchive()
      this.timerSub = interval(300000).subscribe({
        next: () => this.backendService.loadArchive(),
      });
    }

    // Auto-Scan — enqueue a violations scan on the scan queue. The queue
    // de-dupes by mode, so this is a no-op (skipped) when a violations scan is
    // already pending or running, and otherwise simply joins the queue.
    this.timerSub = interval(300000).subscribe({
      next: () => {
        if (!this.scanService.autoScan()) return;

        const queued = this.scanService.enqueueViolationsScan({
          from:
            this.scanService.selectedRange() === 'week'
              ? this.dateService.violationsSevenDaysAgo
              : this.dateService.violationsMonthAgo,
          to: this.dateService.violationsToday,
        });

        this.notification.info(
          queued === null
            ? `Violations auto-scan skipped (already queued)`
            : `Violations auto-scan queued`,
        );
      },
    });
  }

  ngAfterViewInit() {
    if (this.isPopup) {
      this.popUp();
    }
  }

  ngOnDestroy(): void {
    if (this.timerSub) this.timerSub.unsubscribe();
    if (this.subscriptions) this.subscriptions.unsubscribe();
  }

  hideInfo() {
    this.extensionTabNavigationService.selectedTabIndex.set(2);
  }
  displayInfo() {
    this.extensionTabNavigationService.selectedTabIndex.set(3);
  }

  private handleKeyboardEvent(event: KeyboardEvent) {
    if (event.ctrlKey) {
      switch (event.key) {
        case '1':
          this.extensionTabNavigationService.selectedTabIndex.set(0);
          event.preventDefault();
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
  }

  changeSelectedIndex(i: number) {
    this.extensionTabNavigationService.selectedTabIndex.set(i);
  }

  popUp() {
    const rightSide = this.constantsService.rightSide();
    let height = window.screen.availHeight;
    const windowFeatures = `width=444,height=${height},left=${rightSide ? 6846845 : 0},top=0`;
    window.open('index.html', '', windowFeatures);
    window.close();
  }

  hideContextMenu() {
    this.appService.contextMenuVisible.set(false);
  }
}
