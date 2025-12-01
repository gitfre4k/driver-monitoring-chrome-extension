import { computed, inject, Injectable, signal } from '@angular/core';

import { AppService } from './app.service';

import {
  ICertStatus,
  IScanAdminPortalResult,
  IScanDOTInspections,
  IScanErrors,
  IScanResult,
  IScanViolations,
  ISmartFixResult,
} from '../interfaces';
import { TProgressMode, TScanMode, TScanResult } from '../types';
import { IScanPreViolations } from '../interfaces/drivers.interface';

@Injectable({
  providedIn: 'root',
})
export class ProgressBarService {
  private appService = inject(AppService);

  scanning = signal(false);
  bufferValue = signal(0);
  progressMode = signal<TProgressMode>('determinate');
  constant = computed(() => 100 / this.appService.tenantsSignal().length);
  progressValue = signal(0);
  currentDriver = signal('');
  currentCompany = signal('Dex Solutions');
  activeDriversCount = signal(0);

  violations = signal<IScanViolations[]>([]);
  totalVCount = computed(() => {
    let totalVCount = 0;
    this.violations().forEach(
      (v) => (totalVCount = totalVCount + v.violations.items?.length),
    );

    return totalVCount;
  });
  violationsLastSync = signal('');

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
  cycleHours = signal<IScanPreViolations>({});
  cycleHoursSlider = signal(10);
  cycleHoursCount = computed(() => {
    const cycleHours = this.cycleHours();
    let count = 0;
    for (const company in cycleHours) {
      count = count + cycleHours[company].items.length;
    }
    return count;
  });

  certStatus = signal<ICertStatus>({});

  inspections = signal<IScanDOTInspections[]>([]);
  totalDCount = signal(0);

  smartFixErrors = signal<ISmartFixResult>({});

  teleports = signal<IScanResult>({});
  locationMismatch = signal<IScanResult>({});
  eventErrors = signal<IScanResult>({});
  eventWarnings = signal<IScanResult>({});
  prolongedOnDuty = signal<IScanResult>({});
  malfOrDataDiag = signal<IScanResult>({});
  pcYm = signal<IScanResult>({});
  missingEngineOn = signal<IScanResult>({});
  manualDriving = signal<IScanResult>({});
  highEngineHours = signal<IScanResult>({});
  lowTotalEngineHours = signal<IScanResult>({});
  newDrivers = signal<IScanResult>({});
  fleetManager = signal<IScanResult>({});
  truckChange = signal<IScanResult>({});
  refuelWarning = signal<IScanResult>({});
  statusOverflow = signal<IScanResult>({});

  eventNotes = signal<IScanResult>({});
  excludeOnDutyNotes = signal(false);
  filteredEventNotes = computed(() => {
    const eventNotes = this.eventNotes();
    const excludeOnDutyNotes = this.excludeOnDutyNotes();
    if (!excludeOnDutyNotes) return eventNotes;
    else {
      const filteredEventNotes = {} as IScanResult;
      for (let company in eventNotes) {
        eventNotes[company].forEach((driver) => {
          const filteredEvents = driver.events.filter(
            (event) => event.statusName !== 'On Duty',
          );
          if (filteredEvents.length) {
            if (filteredEventNotes[company])
              filteredEventNotes[company].push({
                driverName: driver.driverName,
                events: filteredEvents,
              });
            else
              filteredEventNotes[company] = [
                { driverName: driver.driverName, events: filteredEvents },
              ];
          }
        });
      }
      return filteredEventNotes;
    }
  });

  adminPortalResults = signal<IScanAdminPortalResult>({});
  adminPortalResultsCount = computed(() => {
    const adminPortalResults = this.adminPortalResults();
    let count = 0;
    for (const company in adminPortalResults) {
      count = count + adminPortalResults[company].length;
    }
    return count;
  });

  showErrors = signal(false);
  vErrors = signal([] as IScanErrors[]);
  pErrors = signal([] as IScanErrors[]);
  dErrors = signal([] as IScanErrors[]);
  aErrors = signal([] as IScanErrors[]);
  cErrors = signal([] as IScanErrors[]);
  unEvErrors = signal([] as IScanErrors[]);
  adminErrors = signal([] as IScanErrors[]);
  errorCount = computed(
    () =>
      this.vErrors().length +
      this.pErrors().length +
      this.dErrors().length +
      this.aErrors().length +
      this.cErrors().length +
      this.unEvErrors().length +
      this.adminErrors().length,
  );
  resultsAreReady = computed(
    () =>
      !this.isEmpty(this.teleports()) ||
      !this.isEmpty(this.statusOverflow()) ||
      !this.isEmpty(this.smartFixErrors()) ||
      !this.isEmpty(this.locationMismatch()) ||
      !this.isEmpty(this.eventErrors()) ||
      !this.isEmpty(this.eventWarnings()) ||
      !this.isEmpty(this.prolongedOnDuty()) ||
      !this.isEmpty(this.malfOrDataDiag()) ||
      !this.isEmpty(this.pcYm()) ||
      !this.isEmpty(this.missingEngineOn()) ||
      !this.isEmpty(this.manualDriving()) ||
      !this.isEmpty(this.highEngineHours()) ||
      !this.isEmpty(this.lowTotalEngineHours()) ||
      !this.isEmpty(this.newDrivers()) ||
      !this.isEmpty(this.fleetManager()) ||
      !this.isEmpty(this.refuelWarning()) ||
      !this.isEmpty(this.eventNotes()),
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
          (driver) => driver.id !== id,
        );
      });
      const index = violations.findIndex(
        (v) => v.violations.items?.length === 0,
      );
      violations.splice(index, 1);
      return violations;
    });
  }

  removeSmartFixError(companyName: string, driverId: number) {
    const index = this.smartFixErrors()[companyName].findIndex(
      (driver) => driver.driverId === driverId,
    );
    this.smartFixErrors.update((prev) => {
      const newValue = { ...prev };
      newValue[companyName].splice(index, 1);
      if (newValue[companyName].length === 0) delete newValue[companyName];
      return newValue;
    });
  }

  removeAdminPortalResult(companyName: string, vehicleName: string) {
    const index = this.adminPortalResults()[companyName].findIndex(
      (truck) => truck.vehicleName === vehicleName,
    );
    this.adminPortalResults.update((prev) => {
      const newValue = { ...prev };
      newValue[companyName].splice(index, 1);
      if (newValue[companyName].length === 0) delete newValue[companyName];
      return newValue;
    });
  }

  removeItem(scanResult: TScanResult, companyName: string, driverName: string) {
    if (scanResult === 'certStatus') return;

    if (scanResult === 'preViolations' || scanResult === 'cycleHours') {
      const index = this[scanResult]()[companyName].items.findIndex(
        (driver) => driver.driverDisplayName === driverName,
      );
      this[scanResult].update((prev) => {
        const newValue = { ...prev };
        newValue[companyName].items.splice(index, 1);
        if (newValue[companyName].items.length === 0)
          delete newValue[companyName];
        return newValue;
      });
    } else {
      const index = this[scanResult]()[companyName].findIndex(
        (driver) => driver.driverName === driverName,
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
    this.cErrors.set([]);
    this.unEvErrors.set([]);
    this.adminErrors.set([]);
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
        this.progressMode.set('determinate');
        break;
      case 'dot':
        this.totalDCount.set(0);
        this.inspections.set([]);
        this.dErrors.set([]);
        this.progressMode.set('determinate');
        break;
      case 'advanced':
        this.activeDriversCount.set(0);
        this.teleports.set({});
        this.statusOverflow.set({});
        this.locationMismatch.set({});
        this.eventErrors.set({});
        this.eventWarnings.set({});
        this.prolongedOnDuty.set({});
        this.malfOrDataDiag.set({});
        this.pcYm.set({});
        this.missingEngineOn.set({});
        this.manualDriving.set({});
        this.highEngineHours.set({});
        this.lowTotalEngineHours.set({});
        this.newDrivers.set({});
        this.truckChange.set({});
        this.fleetManager.set({});
        this.refuelWarning.set({});
        this.eventNotes.set({});
        this.aErrors.set([]);
        this.progressMode.set('determinate');
        break;
      case 'pre':
        this.preViolations.set({});
        this.cycleHours.set({});
        this.pErrors.set([]);
        this.progressMode.set('determinate');
        break;
      case 'cert':
        this.activeDriversCount.set(0);
        this.certStatus.set({});
        this.cErrors.set([]);
        this.progressMode.set('indeterminate');
        break;
      case 'deleteUE':
        this.unEvErrors.set([]);
        this.progressMode.set('indeterminate');
        break;
      case 'admin':
        this.adminPortalResults.set({});
        this.adminErrors.set([]);
        this.progressMode.set('determinate');
        break;
      case 'smartFix':
        this.smartFixErrors.set({});
        // this.aErrors.set([]); errors
        this.progressMode.set('determinate');
        break;
      default:
        return;
    }
  }
}
