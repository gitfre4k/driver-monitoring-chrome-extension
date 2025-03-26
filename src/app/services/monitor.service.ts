import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MonitorService {
  url = signal<string | null>(null);
  tenant = signal<{
    id: string;
    name: string;
  } | null>(null);

  constructor() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'urlChanged') {
        this.url.set(request.data.url);
        this.tenant.set(JSON.parse(request.data.tenant).prologs);
      }
    });
  }
}
