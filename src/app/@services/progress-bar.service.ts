import { computed, inject, Injectable, signal } from '@angular/core';

import { AppService } from './app.service';

import {
  IScanDOTInspections,
  IScanErrors,
  IScanResult,
  IScanViolations,
  ITenant,
  IViolations,
} from '../interfaces';
import { TScanMode, TScanResult } from '../types';
import { IScanPreViolations } from '../interfaces/drivers.interface';

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

  preViolations = signal<IScanPreViolations>({});
  preViolationsSlider = signal(20);
  preViolationsCount = computed(() => {
    const preViolations = this.preViolations();
    let count = 0;
    for (const company in preViolations) {
      count = count + preViolations[company].items.length;
    }
    return count;
  });

  violations = signal<IScanViolations[]>([]);
  totalVCount = computed(() => {
    let totalVCount = 0;
    this.violations().forEach(
      (v) => (totalVCount = totalVCount + v.violations.items?.length)
    );

    return totalVCount;
  });
  violationsLastSync = signal('');

  inspections = signal<IScanDOTInspections[]>([]);
  totalDCount = signal(0);

  teleports = signal<IScanResult>({});
  eventErrors = signal<IScanResult>({});
  prolongedOnDuty = signal<IScanResult>({});
  malfOrDataDiag = signal<IScanResult>({});
  pcYm = signal<IScanResult>({});
  missingEngineOn = signal<IScanResult>({});
  manualDriving = signal<IScanResult>({});
  highEngineHours = signal<IScanResult>({});
  lowTotalEngineHours = signal<IScanResult>({});
  newDrivers = signal<IScanResult>({});
  fleetManager = signal<IScanResult>({});

  errors: IScanErrors[] = [];
  scanPreformedOnce = true; // testing...

  deleteViolation(id: number) {
    this.violations.update((prevValue) => {
      let violations = [...prevValue];
      violations.forEach((v) => {
        v.violations.items = v.violations.items.filter(
          (driver) => driver.id !== id
        );
      });
      const index = violations.findIndex(
        (v) => v.violations.items?.length === 0
      );
      violations.splice(index, 1);
      return violations;
    });
  }

  removeItem(scanResult: TScanResult, companyName: string, driverName: string) {
    if (scanResult === 'preViolations') {
      const index = this.preViolations()[companyName].items.findIndex(
        (driver) => driver.driverDisplayName === driverName
      );
      this.preViolations.update((prev) => {
        const newValue = { ...prev };
        newValue[companyName].items.splice(index, 1);
        if (newValue[companyName].items.length === 0)
          delete newValue[companyName];
        return newValue;
      });
    } else {
      const index = this[scanResult]()[companyName].findIndex(
        (driver) => driver.driverName === driverName
      );

      this[scanResult].update((prev) => {
        const newValue = { ...prev };
        newValue[companyName].splice(index, 1);
        if (newValue[companyName].length === 0) delete newValue[companyName];
        return newValue;
      });
    }
  }

  constructor() {}

  initializeProgressBar() {
    this.scanPreformedOnce = true;
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
        this.prolongedOnDuty.set({});
        this.malfOrDataDiag.set({});
        this.pcYm.set({});
        this.missingEngineOn.set({});
        this.manualDriving.set({});
        this.highEngineHours.set({});
        this.lowTotalEngineHours.set({});
        break;
      case 'pre':
        this.preViolations.set({});
        break;
      default:
        return;
    }
  }
}
