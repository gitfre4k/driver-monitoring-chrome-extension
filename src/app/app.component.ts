import { Component, HostListener, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatTabsModule } from "@angular/material/tabs";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatBadgeModule } from "@angular/material/badge";

import { ScanComponent } from "./components/scan/scan.component";
import { MonitorComponent } from "./components/monitor/monitor.component";
import { ProgressBarService } from "./@services/progress-bar.service";
import { InfoComponent } from "./components/info/info.component";
import { ScanResultComponent } from "./components/scan-result/scan-result.component";
import { ExtensionTabNavigationService } from "./@services/extension-tab-navigation.service";
import { interval, Subscription } from "rxjs";
import { ScanService } from "./@services/scan.service";
import { IViolations } from "./interfaces";
import { MatSnackBar } from "@angular/material/snack-bar";
import { DateService } from "./@services/date.service";
import { ErrorsComponent } from "./components/errors/errors.component";
import { TemplatesComponent } from "./components/templates/templates.component";
import { AppService } from "./@services/app.service";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ConstantsService } from "./@services/constants.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
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
    ScanResultComponent,
    TemplatesComponent,
    MatProgressSpinnerModule,
  ],
})
export class AppComponent {
  title = "driver-monitoring-chrome-extension";

  @HostListener("window:keydown", ["$event"])
  handleWindowKeyboardEvent(event: KeyboardEvent) {
    this.handleKeyboardEvent(event);
  }

  private extensionTabNavigationService = inject(ExtensionTabNavigationService);
  private progressBarService = inject(ProgressBarService);
  private appService = inject(AppService);
  private scanService = inject(ScanService);
  private _snackBar = inject(MatSnackBar);
  private dateService = inject(DateService);
  private constantsService = inject(ConstantsService);
  private subscriptions: Subscription = new Subscription();

  selectedTabIndex = this.extensionTabNavigationService.selectedTabIndex;
  scanning = this.progressBarService.scanning;
  violationsCount = this.progressBarService.totalVCount;
  showErrors = this.progressBarService.showErrors;

  errCount = this.progressBarService.errorCount;

  isPopup = false;
  currentCounter: number = 0;
  currentOperationStatus: string = "idle";

  timerSub!: Subscription;

  isLoading = this.appService.isLoading;
  initMode = this.appService.initMode;
  initPhase = this.appService.initPhase;
  initProgressValue = this.appService.initProgressValue;
  initCurrentTenant = this.appService.initCurrentTenant;

  constructor() {}

  ngOnInit(): void {
    if (typeof chrome !== "undefined" && chrome.extension) {
      const views = chrome.extension.getViews({ type: "popup" });
      this.isPopup = views.some((view) => view === window);
    }

    /////////////
    // initialize app
    this.appService.initializeAppDevMode$().subscribe();
    // this.appService.initializeApp$().subscribe();

    // Auto-Scan
    this.timerSub = interval(300000).subscribe({
      next: () => {
        if (!this.scanning() && this.scanService.autoScan()) {
          this._snackBar.open(`Initiating violations auto-scan`, "OK", {
            duration: 3000,
          });

          return this.scanService
            .getAllViolations({
              from:
                this.scanService.selectedRange() === "week"
                  ? this.dateService.violationsSevenDaysAgo
                  : this.dateService.violationsMonthAgo,
              to: this.dateService.violationsToday,
            })
            .subscribe({
              next: (data: IViolations[]) =>
                this.scanService.handleScanData(data, "violations"),
              error: (err) => this.scanService.handleError(err),
              complete: () => this.scanService.handleScanComplete("violations"),
            });
        } else
          return (
            this.scanService.autoScan() &&
            this._snackBar.open(`Violations auto-scan skiped`, "OK", {
              duration: 3000,
            })
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

  private handleKeyboardEvent(event: KeyboardEvent) {
    if (event.ctrlKey) {
      switch (event.key) {
        case "1":
          this.extensionTabNavigationService.selectedTabIndex.set(0);
          event.preventDefault();
          break;
        case "2":
          this.extensionTabNavigationService.selectedTabIndex.set(1);
          event.preventDefault();
          break;
        case "3":
          this.extensionTabNavigationService.selectedTabIndex.set(2);
          event.preventDefault();
          break;
        case "4":
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
    window.open("index.html", "", windowFeatures);
    window.close();
  }

  hideContextMenu() {
    this.appService.contextMenuVisible.set(false);
  }
}
