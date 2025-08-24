import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { ApiService } from './api.service';
import { UrlService } from './url.service';
import { from, mergeMap, switchMap, tap } from 'rxjs';
import { IAppMasterData } from '../interfaces/app-master-data.interface';
import { ITenant } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private apiService = inject(ApiService);
  private urlService = inject(UrlService);

  isLoading = signal(false);

  tenantsSignal2 = signal<ITenant[]>([]);
  tenantsSignal = toSignal(this.apiService.getAccessibleTenants(), {
    initialValue: [],
  });
  initConstant = computed(() => 100 / this.tenantsSignal().length);
  initProgressValue = signal(0);

  // appDataSignal = signal<IAppMasterData>({});

  currentTenant = computed(() => {
    const tenant = this.tenantsSignal().find(
      (t) => t.id === this.urlService.tenant()?.id
    );

    return tenant ? tenant : null;
  });

  // initializeAppData$ = () => {
  //   return this.apiService
  //     .getAccessibleTenants()
  //     .pipe(
  //       tap((tenants) => {
  //         !tenants.find(
  //           (t) => t.id === '3a0e2d3b-8214-edb4-c139-0d55051fc170'
  //         ) && window.close();
  //         this.tenantsSignal2.set(tenants);
  //       })
  //     )
  //     .pipe(
  //       switchMap((tenants) => from(tenants)),
  //       mergeMap((tenant) => {
  //         return this.apiService.getMasterAppData(tenant).pipe(
  //           tap((data) => {
  //             this.appDataSignal.update((prevValue) => ({
  //               ...prevValue,
  //               [tenant.id]: data,
  //             }));
  //             this.initProgressValue.update(
  //               (prev) => prev + this.initConstant()
  //             );
  //           })
  //         );
  //       }, 10)
  //     );
  // };

  constructor() {}
}
