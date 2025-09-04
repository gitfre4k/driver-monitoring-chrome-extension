import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
} from '@angular/core';
import { formatTenantName } from '../../../helpers/monitor.helpers';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MonitorService } from '../../../@services/monitor.service';
import { DateTime } from 'luxon';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-monitor-header',
  imports: [MatIconModule, MatProgressSpinnerModule, DatePipe],
  templateUrl: './monitor-header.component.html',
  styleUrl: './monitor-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitorHeaderComponent {
  @Input() companyName = '';
  @Input() driverName = '';

  private monitorService = inject(MonitorService);

  driverInfo = this.monitorService.driverInfo;
  isUpdating = this.monitorService.isUpdating;

  formatTenantName = formatTenantName;

  get date() {
    const zone = this.monitorService.driverDailyLog()?.homeTerminalTimeZone!;
    const date = this.monitorService.driverDailyLog()?.date!;

    return DateTime.fromISO(date).setZone(zone).toISO();
  }
}
