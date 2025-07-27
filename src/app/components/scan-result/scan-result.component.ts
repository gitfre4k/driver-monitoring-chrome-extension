import { Component, computed, inject } from '@angular/core';
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
import { IScanResult, ITenant } from '../../interfaces';
import { ExtensionTabNavigationService } from '../../@services/extension-tab-navigation.service';

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
  ],
  templateUrl: './scan-result.component.html',
  styleUrl: './scan-result.component.scss',
  providers: [
    {
      provide: MAT_EXPANSION_PANEL_DEFAULT_OPTIONS,
      useValue: {
        collapsedHeight: '32px',
        expandedHeight: '40px',
      },
    },
  ],
})
export class ScanResultComponent {
  private _snackBar = inject(MatSnackBar);
  private urlService = inject(UrlService);
  progressBarService = inject(ProgressBarService);
  extensionNavigation = inject(ExtensionTabNavigationService);

  driverCount = this.progressBarService.activeDriversCount;

  violations = this.progressBarService.violations;
  violationsCount = computed(() => {
    let totalVCount = 0;
    this.violations().forEach(
      (v) => (totalVCount = totalVCount + v.violations.items.length)
    );

    return totalVCount;
  });
  inspections = this.progressBarService.inspections;
  inspectionsCount = this.progressBarService.totalDCount;

  constructor() {}

  resultCount(result: IScanResult) {
    let count = 0;
    for (let company in result) {
      result[company].forEach((driver) => (count += driver.events.length));
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

  openLogs(id: number, date: string, tenant: ITenant) {
    this.urlService.navigateChromeActiveTab(
      `https://app.monitoringdriver.com/logs/${id}/${date}/`,
      tenant
    );
  }

  deleteViolation(id: number) {
    this.violations.update((prevValue) => {
      let violations = prevValue;
      violations.forEach((v) => {
        v.violations.items = v.violations.items.filter(
          (driver) => driver.id !== id
        );
      });
      violations.filter((v) => v.violations.items.length === 0);
      console.log(violations);
      return violations;
    });
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
    return window.innerWidth > 286
      ? 'prolenged On Duties'
      : 'prolenged OnDuties';
  }
}
