import { computed, inject, Injectable, signal } from '@angular/core';

import { ApiService } from './api.service';
import { UrlService } from './url.service';
import { finalize, switchMap, tap } from 'rxjs';

import { ITenant } from '../interfaces';

import { ITenantsLog } from '../interfaces/data.interface';
import { ConstantsService } from './constants.service';
import { IUser } from '../interfaces/api.interface';
// import { AccessService } from './access.service';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private apiService = inject(ApiService);
  private urlService = inject(UrlService);

  constantsService = inject(ConstantsService);
  // accessService = inject(AccessService);

  httpLimit = this.constantsService.httpLimit;

  tenantsSignal = signal<ITenant[]>([]);
  tenantsLogSignal = signal<ITenantsLog>({});

  isLoading = signal(false);
  initPhase = signal('');
  initMode = signal<'indeterminate' | 'determinate'>('indeterminate');
  initCurrentTenant = signal('');
  initConstant = computed(() => 100 / this.tenantsSignal().length);
  initProgressValue = signal(0);

  currentTenant = computed(() => {
    const tenant = this.tenantsSignal().find(
      (t) => t.id === this.urlService.tenant()?.id,
    );

    return tenant ? tenant : null;
  });

  contextMenuVisible = signal(false);

  constructor() {}

  initializeAppDevMode$ = () => {
    this.isLoading.set(true);
    this.initMode.set('indeterminate');
    this.initPhase.set('getting accessible tenants...');

    return this.apiService.getAccessibleTenants().pipe(
      tap((tenants) => {
        this.tenantsSignal.set(tenants);
      }),

      finalize(() => this.isLoading.set(false)),
    );
  };
}
