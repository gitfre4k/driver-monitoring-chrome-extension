import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import {
  MAT_EXPANSION_PANEL_DEFAULT_OPTIONS,
  MatExpansionModule,
} from '@angular/material/expansion';

import { ProgressBarService } from '../../@services/progress-bar.service';
import { UrlService } from '../../@services/url.service';
import {
  ICertStatus,
  IScanResult,
  ISmartFixResult,
  ITenant,
} from '../../interfaces';
import { ExtensionTabNavigationService } from '../../@services/extension-tab-navigation.service';
import { DateService } from '../../@services/date.service';
import { DateTime } from 'luxon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatBottomSheet,
  MatBottomSheetModule,
} from '@angular/material/bottom-sheet';
import { getStatusDuration } from '../../helpers/app.helpers';
import { ConstantsService } from '../../@services/constants.service';
import { AdvancedScanService } from '../../@services/advanced-scan.service';

@Component({
  selector: 'app-scan-result',
  imports: [
    CommonModule,
    MatExpansionModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatBottomSheetModule,
  ],
  templateUrl: './scan-result.component.html',
  styleUrl: './scan-result.component.scss',
  providers: [
    {
      provide: MAT_EXPANSION_PANEL_DEFAULT_OPTIONS,
      useValue: {
        collapsedHeight: '28px',
        expandedHeight: '36px',
      },
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanResultComponent {
  private _snackBar = inject(MatSnackBar);
  private urlService = inject(UrlService);
  private advancedScanService = inject(AdvancedScanService);
  progressBarService = inject(ProgressBarService);
  extensionNavigation = inject(ExtensionTabNavigationService);
  dateService = inject(DateService);
  constanstsService = inject(ConstantsService);

  private _bottomSheet = inject(MatBottomSheet);

  activeDriverCount = this.progressBarService.activeDriversCount;

  hiddenViolations = this.constanstsService.hiddenViolations;
  vCount = this.progressBarService.totalVCount;

  inspections = this.progressBarService.inspections;
  inspectionsCount = this.progressBarService.totalDCount;

  getStatusDuration = getStatusDuration;

  excludeCoDriversHighEngHrs = signal(false);
  filteredHighEngHrs = computed(() => {
    const engHrs = this.progressBarService.highEngineHours();
    const excludeCoDriversHighEngHrs = this.excludeCoDriversHighEngHrs();

    const analyzedCoDrivers = this.advancedScanService.analyzedCoDrivers();

    if (!excludeCoDriversHighEngHrs) return engHrs;
    else {
      const filteredHighEngHrs = {} as IScanResult;
      for (let company in engHrs) {
        engHrs[company].forEach((driver) => {
          const filteredEvents = driver.events.filter(
            (event) =>
              !analyzedCoDrivers[event.tenant.id]?.includes(event.driver.id),
          );
          if (filteredEvents.length) {
            if (filteredHighEngHrs[company])
              filteredHighEngHrs[company].push({
                driverName: driver.driverName,
                events: filteredEvents,
              });
            else
              filteredHighEngHrs[company] = [
                { driverName: driver.driverName, events: filteredEvents },
              ];
          }
        });
      }

      return filteredHighEngHrs;
    }
  });

  constructor() {}

  removeHiddenViolations() {
    this.constanstsService.hiddenViolations.set([]);
  }

  hideViolation(violation: {
    violationId: string;
    type: string;
    startTime: string;
    endTime: string;
    logDate: string;
    homeTerminalTimeZone: string;
  }) {
    const { startTime, type } = violation;
    this.constanstsService.hiddenViolations.update((prev) => [
      ...prev,
      { startTime, type },
    ]);
  }

  resultCount(result: IScanResult) {
    let count = 0;
    for (let company in result) {
      result[company].forEach((driver) => (count += driver.events.length));
    }
    return count;
  }

  driverCount(result: IScanResult | ICertStatus | ISmartFixResult) {
    let count = 0;
    for (let company in result) {
      count += result[company].length;
    }
    return count;
  }

  isEmpty(obj: any): boolean {
    return Object.keys(obj).length === 0;
  }

  copyDriverName(name: string) {
    navigator.clipboard.writeText(name);
    this._snackBar.open(`Copied: ${name}`, 'OK', { duration: 1500 });
  }

  openLogs(id: number, date: string, tenant: ITenant, openLogs?: boolean) {
    openLogs
      ? this.urlService.navigateChromeActiveTab(
          `https://app.monitoringdriver.com/logs/${id}/`,
          tenant,
          true,
        )
      : this.urlService.navigateChromeActiveTab(
          `https://app.monitoringdriver.com/logs/${id}/${date}/`,
          tenant,
        );
  }

  getDate(date: string, zone: string) {
    return DateTime.fromISO(date).setZone('America/New_York').toISO();
  }

  get malfTitle(): string {
    return window.innerWidth > 350
      ? 'Malfunction / DataDiagnostic'
      : 'Malf. / DataDiag.';
  }
  get elapsedEHTitle(): string {
    return window.innerWidth > 335
      ? 'high elapsed Engine Hours'
      : 'high elapsed EH';
  }
  get lowTotalEHTitle(): string {
    return window.innerWidth > 303 ? 'low total Engine Hours' : 'low total EH';
  }
  get prolongedOnDutiesTitle(): string {
    return window.innerWidth > 286 ? 'prolonged On Duty' : 'prolonged OnDuty';
  }
}
