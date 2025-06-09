import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { ApiService } from './api.service';
import { UrlService } from './url.service';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private apiService = inject(ApiService);
  private urlService = inject(UrlService);

  tenantsSignal = toSignal(this.apiService.getAccessibleTenants(), {
    initialValue: [],
  });

  currentTenant = computed(() => {
    const tenant = this.tenantsSignal().find(
      (t) => t.id === this.urlService.tenant()?.id
    );
    return tenant ? tenant : null;
  });

  constructor() {}
}
