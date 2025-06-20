import { computed, inject, Injectable, signal } from '@angular/core';

import { AppService } from './app.service';

import {
  IAdvancedResaults,
  IScanDOTInspections,
  IScanErrors,
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
  totalVCount = signal(0);
  totalDCount = signal(0);
  activeDriversCount = signal(0);

  violations = signal<IScanViolations[]>([]);
  inspections: IScanDOTInspections[] = [];
  advancedResaults: IAdvancedResaults = {
    prolengedOnDuties: {},
    malfOrDataDiagDetection: {},
    pcYm: {},
    missingEngineOn: {},
    highEngineHours: {},
    lowTotalEngineHours: {},
    teleports: {},
    eventErrors: {},
  };

  errors: IScanErrors[] = [];

  constructor() {}

  initializeProgressBar() {
    this.scanning.set(false);
    this.progressValue.set(0);
    this.bufferValue.set(0);
    this.currentCompany.set('Dex Solutions');
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
        this.inspections = [];
        break;
      case 'advanced':
        this.activeDriversCount.set(0);
        this.advancedResaults = {
          prolengedOnDuties: {},
          malfOrDataDiagDetection: {},
          pcYm: {},
          missingEngineOn: {},
          highEngineHours: {},
          lowTotalEngineHours: {},
          teleports: {},
          eventErrors: {},
        };
        break;
      default:
        return;
    }
  }
}
