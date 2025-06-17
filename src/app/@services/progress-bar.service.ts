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
  currentCompany = signal('Dex Solutions');
  currentDriver = signal('');
  totalCount = signal(0);
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

  initializeState(scanMode?: TScanMode) {
    this.progressValue.set(0);
    this.scanning.set(false);
    this.inspections = [];
    this.errors = [];
    this.bufferValue.set(0);
    this.currentCompany.set('Dex Solutions');
    this.activeDriversCount.set(0);
    this.totalCount.set(0);
    switch (scanMode) {
      case 'violations':
        this.violations.set([]);
        break;
      case 'dot':
        this.inspections = [];
        break;
      case 'advanced':
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
