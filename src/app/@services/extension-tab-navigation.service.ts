import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ExtensionTabNavigationService {
  selectedTabIndex = signal(0);

  violationPanelIsOpened = signal(false);
  dotPanelIsOpened = signal(false);
  prePanelIsOpened = signal(false);
  constructor() {}
}
