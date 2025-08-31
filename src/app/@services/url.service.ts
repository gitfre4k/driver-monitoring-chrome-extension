import { Injectable, signal, NgZone, inject } from '@angular/core';
import { BackgroundJsService } from './background-js.service';
import { ICompany } from '../interfaces';
import { ExtensionTabNavigationService } from './extension-tab-navigation.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class UrlService {
  private _snackBar = inject(MatSnackBar);
  backgroundJsService = inject(BackgroundJsService);
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
  }

  refreshWebApp = () => {
    const tabId = this.tabId();
    if (!tabId)
      return this._snackBar.open(
        `Couldn't find the Chrome tab. Please switch to app.monitoringdriver.com manually`,
        'OK',
        {
          duration: 3000,
        }
      );

    return this.backgroundJsService
      .refreshWebApp(tabId)
      .subscribe((success) =>
        console.log('[backgroundJsService] refresh', success)
      );
  };

  focusElement = (elementId: number) => {
    const tabId = this.tabId();
    if (!tabId)
      return this._snackBar.open(
        `Couldn't find the Chrome tab. Please switch to app.monitoringdriver.com manually`,
        'OK',
        {
          duration: 3000,
        }
      );

    return this.backgroundJsService
      .focusElement(tabId, elementId)
      .subscribe((success) =>
        console.log('[backgroundJsService] focus element', success)
      );
  };

  navigateChromeActiveTab = (
    url: string,
    tenant: ICompany,
    stayOnTab?: boolean
  ) => {
    const tabId = this.tabId();
    if (!tabId)
      return this._snackBar.open(
        `Couldn't find the Chrome tab. Please switch to app.monitoringdriver.com manually`,
        'OK',
        {
          duration: 3000,
        }
      );

    const key = 'MASTER_TOOLS_PROVIDER_TENANT';
    const value = JSON.stringify({
      prologs: {
        id: tenant.id,
        name: tenant.name,
      },
    });

    return this.backgroundJsService
      .updateTabLocalStorage(tabId, key, value)
      .subscribe({
        next: () => {
          !stayOnTab && this.extensionTabNavService.selectedTabIndex.set(2);
          chrome.tabs.update(tabId, { url });
        },
      });
  };
}

//  text-sm border bg-secondary-0 border-shade-4 hover:bg-shade-3 cursor-pointer transition-colors duration-300 ease-in-out bg-shade-3
