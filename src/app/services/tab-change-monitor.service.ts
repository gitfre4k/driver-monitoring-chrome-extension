import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TabChangeMonitoringService {
  url = signal<string | null>(null);

  constructor() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'urlChanged') {
        this.url.set(request.url);
      }
    });
  }
}
