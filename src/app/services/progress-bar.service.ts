import { Injectable, signal } from '@angular/core';
import {
  IAdvancedResaults,
  IScanDOTInspections,
  IScanErrors,
  IScanViolations,
} from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class ProgressBarService {
  scanning = signal(false);
  progressValue = signal(0);
  bufferValue = signal(0);
  constant = signal(0);
  currentCompany = signal('');
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
  };

  errors: IScanErrors[] = [];

  constructor() {}

  initializeState() {
    this.progressValue.set(0);
    this.scanning.set(false);
    this.violations = [];
    this.inspections = [];
    this.errors = [];
    this.bufferValue.set(0);
    this.constant.set(0);
    this.currentCompany.set('Dex Solutions');
    this.totalCount.set(0);
  }
}
