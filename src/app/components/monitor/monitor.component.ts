import {
  Component,
  computed,
  inject,
} from '@angular/core';
import { MonitorService } from '../../ser../../services/monitor.service';
import { ApiService } from '../../services/api.service';
import { ITenant } from '../../interfaces';

@Component({
  selector: 'app-monitor',
  imports: [],
  templateUrl: './monitor.component.html',
  styleUrl: './monitor.component.scss',
})
export class MonitorComponent {
  private monitorService = inject(MonitorService);
  private apiService = inject(ApiService);

  url = this.monitorService.url;
  tenant = this.monitorService.tenant;

  parts = computed(() => this.url()?.split('/'));
  logs = computed(() => this.parts()?.[3]);
  id = computed(() => this.parts()?.[4]);
  timestamp = computed(() => this.parts()?.[5]);

  test() {
    const logs = this.logs();
    const id = this.id()
    const timestamp = this.timestamp()
    const tenant: ITenant = JSON.parse(this.tenant() as string)

    if (logs === 'logs' && timestamp && tenant && id) {
      this.apiService.getDriverDailyLogEvents(+id, timestamp, tenant.prologs.id).subscribe(
        { next: (q) => console.log(q.events) }
      )

    }
  }

  // {"prologs":{"id":"3a17cf3f-6679-c76d-0e6c-b1b66e372336","name":"Autolift, INC"}}

  // console.log(JSON.parse(this.tenant() as string))





}