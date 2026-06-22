import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ProgressBarService } from '../../../@services/progress-bar.service';
import { ConstantsService } from '../../../@services/constants.service';
import { UrlService } from '../../../@services/url.service';
import { IScanResult } from '../../../interfaces';
import { TScanResult } from '../../../types';
import { IEvent } from '../../../interfaces/driver-daily-log-events.interface';

@Component({
  selector: 'app-scan-result-section',
  imports: [
    CommonModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
  ],
  templateUrl: './scan-result-section.component.html',
  styleUrl: './scan-result-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanResultSectionComponent {
  private constantsService = inject(ConstantsService);
  progressBarService = inject(ProgressBarService);
  private urlService = inject(UrlService);
  private snackBar = inject(MatSnackBar);

  title = input.required<string>();
  rawData = input.required<IScanResult>();
  scanResultKey = input.required<TScanResult>();
  hiddenKey = input<string>('');
  countMode = input<'events' | 'drivers'>('events');
  showAllEvents = input<boolean>(false);
  eventRowTemplate = input.required<TemplateRef<{ $implicit: IEvent; hide: () => void }>>();
  headerTemplate = input<TemplateRef<void> | null>(null);

  private hiddenMap = computed(() => {
    const key = this.hiddenKey();
    if (!key) return {} as Record<string, string[]>;
    return this.constantsService.hiddenScanResults()[key] ?? {};
  });

  filteredData = computed<IScanResult>(() => {
    const data = this.rawData();
    const map = this.hiddenMap();
    if (!Object.keys(map).length) return data;
    const result: IScanResult = {};
    for (const company in data) {
      const hiddenIds = map[company] ?? [];
      const drivers = data[company]
        .map((d) => ({
          ...d,
          events: d.events.filter((e) => !hiddenIds.includes(String(e.id))),
        }))
        .filter((d) => d.events.length > 0);
      if (drivers.length) result[company] = drivers;
    }
    return result;
  });

  count = computed(() => {
    const data = this.filteredData();
    const mode = this.countMode();
    let count = 0;
    for (const company in data) {
      if (mode === 'drivers') {
        count += data[company].length;
      } else {
        data[company].forEach((d) => (count += d.events.length));
      }
    }
    return count;
  });

  hiddenCount = computed(() => {
    const map = this.hiddenMap();
    return Object.values(map).reduce((sum, arr) => sum + arr.length, 0);
  });

  isEmpty(obj: IScanResult): boolean {
    return Object.keys(obj).length === 0;
  }

  done(company: string, driverName: string) {
    this.progressBarService.removeItem(this.scanResultKey(), company, driverName);
  }

  hide(company: string, eventId: number) {
    const key = this.hiddenKey();
    if (!key) return;
    const id = String(eventId);
    this.constantsService.hiddenScanResults.update((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {}),
        [company]: [
          ...(prev[key]?.[company] ?? []).filter((n) => n !== id),
          id,
        ],
      },
    }));
  }

  getHideFn(company: string, eventId: number): () => void {
    return () => this.hide(company, eventId);
  }

  clearHidden() {
    const key = this.hiddenKey();
    if (!key) return;
    this.constantsService.hiddenScanResults.update((prev) => {
      const result = { ...prev };
      delete result[key];
      return result;
    });
  }

  openLogs(event: IEvent) {
    this.urlService.navigateChromeActiveTab(
      `https://app.monitoringdriver.com/logs/${event.driver.id}/${event.date}/`,
      event.tenant,
    );
  }

  copyName(name: string) {
    navigator.clipboard.writeText(name);
    this.snackBar.open(`Copied: ${name}`, 'OK', { duration: 1500 });
  }
}
