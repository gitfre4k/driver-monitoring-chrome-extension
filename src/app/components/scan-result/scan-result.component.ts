import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MAT_EXPANSION_PANEL_DEFAULT_OPTIONS,
  MatExpansionModule,
} from '@angular/material/expansion';

import { ProgressBarService } from '../../@services/progress-bar.service';
import { MatBadgeModule } from '@angular/material/badge';
import { UrlService } from '../../@services/url.service';

@Component({
  selector: 'app-scan-result',
  imports: [
    CommonModule,
    MatExpansionModule,
    FormsModule,
    MatDivider,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
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
  private progressBarService = inject(ProgressBarService);
  private urlService = inject(UrlService);

  scanResults = this.progressBarService.advancedResaults;
  driverCount = this.progressBarService.activeDriversCount;

  violations = this.progressBarService.violations;
  violationsCount = this.progressBarService.totalVCount;

  isEmpty(obj: any): boolean {
    return Object.keys(obj).length === 0;
  }

  copyDriverName(name: string) {
    navigator.clipboard.writeText(name);
    this._snackBar.open(`Copied: ${name}`, 'OK', { duration: 1500 });
  }

  openLogs(id: number, date: string, tenantId: string) {
    console.log('############# ', id, date, tenantId);
    if (!id || !date) return;

    const url = `https://app.monitoringdriver.com/logs/${id}/${date}/`;
    console.log('############# ', url);

    // update local storage tenant ID
    // ...

    this.urlService.navigateChromeActiveTab(url);
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
