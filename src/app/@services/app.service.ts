import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { ApiService } from './api.service';
import { UrlService } from './url.service';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private apiService = inject(ApiService);
  private urlService = inject(UrlService);

  tenantsSignal = toSignal(
    this.apiService
      .getAccessibleTenants()
      .pipe(
        tap(
          (tenants) =>
            !tenants.find(
              (t) => t.id === '3a0e2d3b-8214-edb4-c139-0d55051fc170'
            ) && window.close()
        )
      ),
    {
      initialValue: [],
    }
  );

  currentTenant = computed(() => {
    const tenant = this.tenantsSignal().find(
      (t) => t.id === this.urlService.tenant()?.id
    );

    return tenant ? tenant : null;
  });

  constructor() {}
}
