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

  violations: IScanViolations[] = [];
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

  initializeState(scanMode: TScanMode) {
    this.progressValue.set(0);
    this.scanning.set(false);
    this.violations = [];
    this.inspections = [];
    this.errors = [];
    this.bufferValue.set(0);
    this.currentCompany.set('Dex Solutions');
    this.totalCount.set(0);
    switch (scanMode) {
      case 'violations':
        return (this.violations = []);
      case 'dot':
        return (this.inspections = []);
      case 'advanced':
        return (this.advancedResaults = {
          prolengedOnDuties: {},
          malfOrDataDiagDetection: {},
          pcYm: {},
          missingEngineOn: {},
          highEngineHours: {},
          lowTotalEngineHours: {},
          teleports: {},
          eventErrors: {},
        });
      default:
        return;
    }
  }
}
