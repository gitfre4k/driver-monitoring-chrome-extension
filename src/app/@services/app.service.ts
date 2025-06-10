import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { ApiService } from './api.service';
import { UrlService } from './url.service';
import { ILog, ITenant } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private apiService = inject(ApiService);
  private urlService = inject(UrlService);

  // currentTenant = signal(null as ITenant | null);
  // currentLogs = signal([] as ILog[]);

  tenantsSignal = toSignal(this.apiService.getAccessibleTenants(), {
    initialValue: [],
  });

  currentTenant = computed(() => {
    const tenant = this.tenantsSignal().find(
      (t) => t.id === this.urlService.tenant()?.id
    );
    return tenant ? tenant : null;
  });

  // currentLogs = computed(() => this.apiService.getLogs(this.currentTenant, new Date()))

  constructor() {}

  // initializeAppState() {
  //   this.apiService.getAccessibleTenants().subscribe({
  //     next: (tenants) => this.tenantsSignal.set(tenants),
  //   });
  // }
}
