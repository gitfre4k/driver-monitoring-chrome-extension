import { computed, inject, Injectable, signal } from '@angular/core';

import { AppService } from './app.service';

import {
  IScanDOTInspections,
  IScanErrors,
  IScanResult,
  IScanViolations,
} from '../interfaces';
import { TScanMode } from '../types';

@Injectable({
  providedIn: 'root',
})
export class ProgressBarService {
  private appService = inject(AppService);

  scanning = signal(false);
  progressValue = signal(0);
  bufferValue = signal(0);
  constant = computed(() => 100 / this.appService.tenantsSignal().length);
  currentDriver = signal('');
  currentCompany = signal('Dex Solutions');
  activeDriversCount = signal(0);

  violations = signal<IScanViolations[]>([]);
  totalVCount = signal(0);
  violationsLastSync = signal('');

  inspections = signal<IScanDOTInspections[]>([]);
  totalDCount = signal(0);

  teleports = signal<IScanResult>({});
  eventErrors = signal<IScanResult>({});
  prolengedOnDuty = signal<IScanResult>({});
  malfOrDataDiag = signal<IScanResult>({});
  pcYm = signal<IScanResult>({});
  missingEngineOn = signal<IScanResult>({});
  manualDriving = signal<IScanResult>({});
  highEngineHours = signal<IScanResult>({});
  lowTotalEngineHours = signal<IScanResult>({});

  errors: IScanErrors[] = [];

  removeItem(company: string, driverName: string, eventId: number) {}

  constructor() {}

  initializeProgressBar() {
    this.scanning.set(false);
    this.progressValue.set(0);
    this.bufferValue.set(0);
    this.currentCompany.set('');
    this.errors = [];
  }

  initializeState(scanMode: TScanMode) {
    this.initializeProgressBar();
    switch (scanMode) {
      case 'violations':
        this.totalVCount.set(0);
        this.violations.set([]);
        break;
      case 'dot':
        this.totalDCount.set(0);
        this.inspections.set([]);
        break;
      case 'advanced':
        this.activeDriversCount.set(0);
        this.teleports.set({});
        this.eventErrors.set({});
        this.prolengedOnDuty.set({});
        this.malfOrDataDiag.set({});
        this.pcYm.set({});
        this.missingEngineOn.set({});
        this.manualDriving.set({});
        this.highEngineHours.set({});
        this.lowTotalEngineHours.set({});
        break;
      default:
        return;
    }
  }
}
