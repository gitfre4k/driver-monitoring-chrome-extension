import { Component, inject } from '@angular/core';

import { CommonModule } from '@angular/common';
import { MonitorService } from '../../@services/monitor.service';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DateTime } from 'luxon';

@Component({
  selector: 'app-monitor',
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.scss',
  providers: [],
})
export class MonitorComponent {
  monitorService = inject(MonitorService);

  driverInfo = this.monitorService.driverInfo;

  refresh = () => {
    this.monitorService.refresh.update((value) => value + 1);
  };

  get date() {
    const zone = this.monitorService.driverDailyLog()?.homeTerminalTimeZone!;
    const date = this.monitorService.driverDailyLog()?.date!;

    return DateTime.fromISO(date).setZone(zone).toISO();
  }

  getNoSpaceNote(note: string) {
    return note.replace(/\s/g, '');
  }

  formatTenantName(tenant: string) {
    const keywordsToRemove = new Set([
      'logistics',
      'transport',
      'transportations',
      'Transportation',
      'express',
      'enterprises',
      'enterprise',
      'freight',
      'international',
      'cargo',
      'services',
      'trucking',
      'systems',
      'transporting',
    ]);
    let words = tenant.replace(/,/g, '').trim().split(' ');

    if (words.length === 0) return '';

    let lastWord = words[words.length - 1];
    if (
      lastWord.length === 3 ||
      (lastWord.length === 4 && lastWord[lastWord.length - 1] === '.')
    )
      words.pop();
    if (words.length > 0) {
      const newLastWord = words[words.length - 1];
      if (keywordsToRemove.has(newLastWord.toLowerCase())) words.pop();
    }

    return words.join(' ');
  }
}
