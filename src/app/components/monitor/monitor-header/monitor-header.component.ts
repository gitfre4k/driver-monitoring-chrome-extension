import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
} from '@angular/core';
import { formatTenantName } from '../../../helpers/monitor.helpers';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MonitorService } from '../../../@services/monitor.service';
import { DateTime } from 'luxon';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ExtensionTabNavigationService } from '../../../@services/extension-tab-navigation.service';

@Component({
  selector: 'app-monitor-header',
  imports: [MatIconModule, MatButtonModule, MatProgressSpinnerModule, DatePipe],
  templateUrl: './monitor-header.component.html',
  styleUrl: './monitor-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitorHeaderComponent {
  @HostListener('window:keydown', ['$event'])
  handleWindowKeyboardEvent(event: KeyboardEvent) {
    this.handleKeyboardEvent(event);
  }

  @Input() companyName = '';
  @Input() driverName = '';
  @Input() nextLogDate: string | null = null;
  @Input() previousLogDate: string | null = null;
  @Output() changeLogDate = new EventEmitter<string>();

  private monitorService = inject(MonitorService);
  private extTabNavService = inject(ExtensionTabNavigationService);

  driverInfo = this.monitorService.driverInfo;
  isUpdating = this.monitorService.isUpdating;
  selectedTabIndex = this.extTabNavService.selectedTabIndex;

  formatTenantName = formatTenantName;

  onChangeLogDate(date: string | null) {
    if (!date) return;
    this.changeLogDate.emit(date);
  }

  private handleKeyboardEvent(event: KeyboardEvent) {
    if (this.selectedTabIndex() === 2) {
      switch (event.key) {
        case 'ArrowLeft':
          if (this.previousLogDate) {
            this.onChangeLogDate(this.previousLogDate);
            event.preventDefault();
          }
          break;
        case 'ArrowRight':
          if (this.nextLogDate) {
            this.onChangeLogDate(this.nextLogDate);
            event.preventDefault();
          }
          break;

        default:
          break;
      }
    }
  }

  get date() {
    const zone = this.monitorService.driverDailyLog()?.homeTerminalTimeZone!;
    const date = this.monitorService.driverDailyLog()?.date!;

    return DateTime.fromISO(date).setZone(zone).toISO();
  }
}
