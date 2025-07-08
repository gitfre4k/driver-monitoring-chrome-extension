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
  totalDCount = signal(0);
  activeDriversCount = signal(0);

  violations = signal<IScanViolations[]>([]);
  totalVCount = signal(0);
  violationsLastSync = signal('');

  inspections: IScanDOTInspections[] = [];
  advancedResaultsInitialState: IAdvancedResaults = {
    prolengedOnDuties: {},
    malfOrDataDiagDetection: {},
    pcYm: {},
    missingEngineOn: {},
    highEngineHours: {},
    lowTotalEngineHours: {},
    teleports: {},
    eventErrors: {},
    manualDrivingDetection: {},
  };
  advancedResaults: IAdvancedResaults = this.advancedResaultsInitialState;

  errors: IScanErrors[] = [];

  removeItem(company: string, driverName: string, eventId: number) {
    const driver = this.advancedResaults.eventErrors[company].find(
      (d) => d.name === driverName
    );
    const evId = driver?.events.findIndex((ev) => ev.id === eventId);

    if (evId && evId > -1)
      this.advancedResaults.eventErrors[company].slice(evId);
  }

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
        this.inspections = [];
        break;
      case 'advanced':
        this.activeDriversCount.set(0);
        this.advancedResaults = this.advancedResaultsInitialState;
        break;
      default:
        return;
    }
  }
}
