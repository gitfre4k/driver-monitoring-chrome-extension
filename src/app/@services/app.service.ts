import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private apiService = inject(ApiService);

  tenantsSignal = toSignal(this.apiService.getAccessibleTenants(), {
    initialValue: [],
  });

  constructor() {}
}
