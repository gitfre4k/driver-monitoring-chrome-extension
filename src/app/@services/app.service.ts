import { computed, inject, Injectable, signal } from '@angular/core';

import { ApiService } from './api.service';
import { UrlService } from './url.service';
import { finalize, from, mergeMap, switchMap, tap } from 'rxjs';

import { ITenant } from '../interfaces';

import { DateService } from './date.service';
import { ITenantsLog } from '../interfaces/data.interface';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private apiService = inject(ApiService);
  private urlService = inject(UrlService);
  private dateService = inject(DateService);

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
      tap((tenants) => this.tenantsSignal.set(tenants)),
      finalize(() => {
        this.isLoading.set(false);
        console.log(this.tenantsSignal(), this.tenantsLogSignal());
      }),
    );
  };

  initializeApp$ = () => {
    this.isLoading.set(true);
    this.initMode.set('indeterminate');
    this.initPhase.set('getting accessible tenants...');

    return this.apiService
      .getAccessibleTenants()
      .pipe(
        tap((tenants) => {
          !tenants.find(
            (t) => t.id === '3a0e2d3b-8214-edb4-c139-0d55051fc170',
          ) && window.close();
          this.tenantsSignal.set(tenants);
        }),
        finalize(() => {
          this.initMode.set('determinate');
          this.initPhase.set('loading tenants and getting drivers info...');
        }),
      )
      .pipe(
        switchMap((tenants) => from(tenants)),
        mergeMap((tenant) => {
          return this.apiService
            .getLogs(tenant, this.dateService.getLogsDateRange())
            .pipe(
              tap((log) => {
                this.initCurrentTenant.set(tenant.name);
                this.initProgressValue.update(
                  (prev) => prev + this.initConstant(),
                );
                this.tenantsSignal.update((prevV) => {
                  let newValue = [...prevV];

                  let index = newValue.findIndex((t) => t.id === tenant.id);
                  if (index !== -1) {
                    newValue[index].offSet = log.items.length
                      ? this.dateService.getOffsetFromTimeZone(
                          log.items[0].homeTerminalTimeZone,
                        )
                      : -300;
                  }

                  return newValue;
                });
                this.tenantsLogSignal.update((prevV) => {
                  const newValue = { ...prevV };

                  newValue[tenant.id] = log;

                  return newValue;
                });
              }),
            );
        }, 10),
      )
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
          console.log(this.tenantsSignal(), this.tenantsLogSignal());
        }),
      );
  };
}
