import { computed, inject, Injectable, signal } from '@angular/core';

import { AppService } from './app.service';

import {
  IAdvancedResaults,
  IDetectedOnDuties,
  IDetectedResults,
  IDetectedResultsWithDuration,
  IEventErrors,
  IScanDOTInspections,
  IScanErrors,
  IScanViolations,
  ITeleportsEvents,
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

  initialAdvancedScanResults: IAdvancedResaults = {
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

  teleports = signal<ITeleportsEvents>({});
  eventErrors = signal<IEventErrors>({});
  prolengedOnDuty = signal<IDetectedOnDuties>({});
  malfOrDataDiag = signal<IDetectedResults>({});
  pcYm = signal<IDetectedResults>({});
  missingEngineOn = signal<IDetectedResults>({});
  manualDriving = signal<IEventErrors>({});
  highEngineHours = signal<IDetectedResultsWithDuration>({});
  lowTotalEngineHours = signal<IDetectedResults>({});

  advancedResaults: IAdvancedResaults = JSON.parse(
    JSON.stringify(this.initialAdvancedScanResults)
  );

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
        this.inspections.set([]);
        break;
      case 'advanced':
        this.activeDriversCount.set(0);
        this.advancedResaults = JSON.parse(
          JSON.stringify(this.initialAdvancedScanResults)
        );
        break;
      default:
        return;
    }
  }
}
