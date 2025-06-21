import { Injectable, signal, NgZone, inject } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { ICompany } from '../interfaces';
import { ExtensionTabNavigationService } from './extension-tab-navigation.service';

@Injectable({
  providedIn: 'root',
})
export class UrlService {
  localStorageService = inject(LocalStorageService);
  extensionTabNavService = inject(ExtensionTabNavigationService);

  tabId = signal<number | null>(null);
  url = signal<string | null>(null);
  tenant = signal<{
    id: string;
    name: string;
  } | null>(null);

  constructor(private ngZone: NgZone) {
    console.log(
      'UrlService: Constructor called, setting up Chrome message listener.'
    );

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.ngZone.run(() => {
        if (request.action === 'urlChanged') {
          console.log(
            "UrlService: Received 'urlChanged' message from background script.",
            request?.data
          );
          this.tabId.set(request.data.tabId);
          request?.data?.url &&
            request.data.url !== this.url() &&
            this.url.set(request.data.url);
          sendResponse(true);
          try {
            if (typeof request.data.tenant === 'string') {
              const parsedTenant = JSON.parse(request.data.tenant);

              if (
                parsedTenant &&
                parsedTenant.prologs?.id !== this.tenant()?.id
              ) {
                this.tenant.set(parsedTenant.prologs);
              } else
                console.log(
                  'UrlService: Request data contains same tenant ID.'
                );
            } else if (request.data.tenant === null) {
              console.warn('UrlService: Tenant data received as null.');
              this.tenant.set(null);
            } else {
              console.error(
                'UrlService: Unexpected tenant data type. Expected string or null.',
                request.data.tenant
              );
            }
          } catch (e) {
            console.error(
              'UrlService: Error parsing tenant data:',
              e,
              'Raw data:',
              request.data.tenant
            );
          }
        }
      });
    });

    chrome.tabs.getCurrent((tab) => {
      if (tab && tab.id) {
        console.log(tab, tab.id);
        chrome.runtime.sendMessage(
          { action: 'contentScriptReady', tabId: tab.id },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "UrlService: Error sending 'contentScriptReady' message:",
                chrome.runtime.lastError.message
              );
            } else {
              console.log(
                "UrlService: 'contentScriptReady' message sent to background script. Response:",
                response
              );
            }
          }
        );
      } else {
        console.warn(
          "UrlService: Could not get current tab ID to send 'contentScriptReady' message."
        );
      }
    });
  }

  navigateChromeActiveTab = (url: string, tenant: ICompany) => {
    const tabId = this.tabId();
    if (!tabId) return console.log('URL Service - no tabId');

    const key = 'MASTER_TOOLS_PROVIDER_TENANT';
    const value = JSON.stringify({
      prologs: {
        id: tenant.id,
        name: tenant.name,
      },
    });

    this.localStorageService
      .updateTabLocalStorage(tabId, key, value)
      .subscribe({
        next: () => {
          this.extensionTabNavService.selectedTabIndex.set(2);
          chrome.tabs.update(tabId, { url });
        },
      });
  };
}
