import { Injectable, signal, NgZone, inject, computed } from '@angular/core';
import { BackgroundJsService } from './background-js.service';
import { ICompany } from '../interfaces';
import { ExtensionTabNavigationService } from './extension-tab-navigation.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TFocusElementAction } from '../types';

@Injectable({ providedIn: 'root' })
export class UrlService {
  private _snackBar = inject(MatSnackBar);
  backgroundJsService = inject(BackgroundJsService);
  extensionTabNavService = inject(ExtensionTabNavigationService);

  tabId = signal<number | null>(null);
  url = signal<string | null>(null);
  tenant = signal<{ id: string; name: string } | null>(null);
  provider = signal<'prologs' | 'synergy' | 'Prologs' | ''>('');

  hoveredElement = signal<{
    id: string | null;
    action: 'HOVER_START' | 'HOVER_STOP';
  } | null>(null);

  currentView = computed(() => {
    const url = this.url();
    if (!url) return;

    const parts = url.split('/');
    const logs = parts[3];
    const id = +parts[4];
    const timestamp = parts[5];

    return { driverId: id, date: timestamp };
  });

  constructor(private ngZone: NgZone) {
    console.log(
      'UrlService: Constructor called, setting up Chrome message listener.',
    );

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.ngZone.run(() => {
        if (request.action === 'urlChanged') {
          console.log(
            "UrlService: Received 'urlChanged' message from background script.",
            request?.data,
          );
          this.tabId.set(request.data.tabId);
          request?.data?.url &&
            request.data.url !== this.url() &&
            this.url.set(request.data.url);
          sendResponse(true);
          try {
            if (typeof request.data.tenant === 'string') {
              const parsedTenant = JSON.parse(request.data.tenant);
              this.provider.set(
                parsedTenant.prologs
                  ? 'prologs'
                  : parsedTenant.Prologs
                    ? 'Prologs'
                    : 'synergy',
              );

              if (parsedTenant) {
                this.tenant.set(parsedTenant[this.provider()]);
              } else
                console.log(
                  'UrlService: Request data contains same tenant ID.',
                );
            } else if (request.data.tenant === null) {
              console.warn('UrlService: Tenant data received as null.');
              this.tenant.set(null);
            } else {
              console.error(
                'UrlService: Unexpected tenant data type. Expected string or null.',
                request.data.tenant,
              );
            }
          } catch (e) {
            console.error(
              'UrlService: Error parsing tenant data:',
              e,
              'Raw data:',
              request.data.tenant,
            );
          }
        }
        if (request.action === 'hoverEvent') {
          // console.info(
          //   "UrlService: Received 'hoverEvent' message.",
          //   request.data
          // );
          const { elementId, hoverAction } = request.data;
          this.hoveredElement.set({ id: elementId, action: hoverAction });
          sendResponse(true);
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
        { duration: 3000 },
      );

    return this.backgroundJsService
      .refreshWebApp(tabId)
      .subscribe((success) =>
        console.log('[backgroundJsService] refresh', success),
      );
  };

  focusElement = (
    elementId: number,
    action: TFocusElementAction,
    statusName?: string,
  ) => {
    const tabId = this.tabId();
    if (!tabId)
      return this._snackBar.open(
        `Couldn't find the Chrome tab. Please switch to app.monitoringdriver.com manually`,
        'OK',
        { duration: 3000 },
      );

    const payload = { tabId, elementId, statusName };
    return this.backgroundJsService.focusElement(action, payload).subscribe();
  };

  navigateChromeActiveTab = (
    url: string,
    tenant?: ICompany,
    stayOnTab?: boolean,
  ) => {
    const tabId = this.tabId();
    if (!tabId)
      return this._snackBar.open(
        `Couldn't find the Chrome tab. Please switch to app.monitoringdriver.com manually`,
        'OK',
        { duration: 3000 },
      );

    const id = tenant ? tenant.id : this.tenant()!.id;
    const name = tenant ? tenant.name : this.tenant()!.name;

    const key = 'MASTER_TOOLS_PROVIDER_TENANT';
    const value = JSON.stringify({
      [this.provider()]: {
        id,
        name,
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

  onGetAdminProLogsToken = () => {
    return this.backgroundJsService.getAdminProLogsToken();
  };
}
