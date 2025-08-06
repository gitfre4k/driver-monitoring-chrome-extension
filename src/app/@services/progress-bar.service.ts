import { computed, inject, Injectable, signal } from '@angular/core';

import { AppService } from './app.service';

import {
  IScanDOTInspections,
  IScanErrors,
  IScanResult,
  IScanViolations,
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
  refuelWarning = signal<IScanResult>({});

  showErrors = signal(false);
  vErrors = signal([] as IScanErrors[]);
  pErrors = signal([] as IScanErrors[]);
  dErrors = signal([] as IScanErrors[]);
  aErrors = signal([] as IScanErrors[]);
  errorCount = computed(
    () =>
      this.vErrors().length +
      this.pErrors().length +
      this.dErrors().length +
      this.aErrors().length
  );
  resultsAreReady = computed(
    () =>
      !this.isEmpty(this.teleports()) ||
      !this.isEmpty(this.eventErrors()) ||
      !this.isEmpty(this.prolongedOnDuty()) ||
      !this.isEmpty(this.malfOrDataDiag()) ||
      !this.isEmpty(this.pcYm()) ||
      !this.isEmpty(this.missingEngineOn()) ||
      !this.isEmpty(this.manualDriving()) ||
      !this.isEmpty(this.highEngineHours()) ||
      !this.isEmpty(this.lowTotalEngineHours()) ||
      !this.isEmpty(this.refuelWarning())
  );

  constructor() {}

  isEmpty(obj: any): boolean {
    return Object.keys(obj).length === 0;
  }

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

  clearErrors() {
    this.vErrors.set([]);
    this.pErrors.set([]);
    this.dErrors.set([]);
    this.aErrors.set([]);
  }

  initializeProgressBar() {
    this.scanning.set(false);
    this.progressValue.set(0);
    this.bufferValue.set(0);
    this.currentCompany.set('');
  }

  initializeState(scanMode: TScanMode) {
    this.initializeProgressBar();
    switch (scanMode) {
      case 'violations':
        this.violations.set([]);
        this.vErrors.set([]);
        break;
      case 'dot':
        this.totalDCount.set(0);
        this.inspections.set([]);
        this.dErrors.set([]);
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
        this.refuelWarning.set({});
        this.aErrors.set([]);
        break;
      case 'pre':
        this.preViolations.set({});
        this.pErrors.set([]);
        break;
      default:
        return;
    }
  }
}
