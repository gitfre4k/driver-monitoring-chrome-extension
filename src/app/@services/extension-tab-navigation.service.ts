import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ExtensionTabNavigationService {
  selectedTabIndex = signal(0);

  constructor() {}
}
