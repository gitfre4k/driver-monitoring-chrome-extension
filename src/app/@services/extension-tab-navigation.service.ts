import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ExtensionTabNavigationService {
  selectedTabIndex = signal(0);

  /** Which group the Settings page shows when opened (General | Scan). */
  settingsView = signal<'general' | 'scan'>('general');

  violationPanelIsOpened = signal(false);
  dotPanelIsOpened = signal(false);
  prePanelIsOpened = signal(false);
  cyclePanelIsOpened = signal(false);
  constructor() {}
}
