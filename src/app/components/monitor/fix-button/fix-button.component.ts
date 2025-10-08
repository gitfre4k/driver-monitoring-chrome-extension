import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { MonitorService } from '../../../@services/monitor.service';
import { ContextMenuService } from '../../../@services/context-menu.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { IEvent } from '../../../interfaces/driver-daily-log-events.interface';

@Component({
  selector: 'app-fix-button',
  imports: [MatProgressSpinnerModule, MatIconModule],
  templateUrl: './fix-button.component.html',
  styleUrl: './fix-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FixButtonComponent {
  monitorService = inject(MonitorService);
  contextMenuService = inject(ContextMenuService);

  event = input.required<IEvent>();
  action = input.required<'ADD_PTI' | 'EXTEND_PTI' | 'ADD_PTI_NOTE'>();

  isDisabled = computed(() => {
    if (this.monitorService.isUpdating()) return true;

    return this.monitorService.disableFixButtons();
  });

  button = computed(() => {
    const action = this.action();
    switch (action) {
      case 'ADD_PTI':
        return {
          icon: 'playlist_add',
          name: 'add Pre-Trip Inspection',
          iconClass: 'fix-error__button__icon',
        };
      case 'EXTEND_PTI':
        return {
          icon: 'expand_content',
          name: 'extend Pre-Trip Inspection',
          iconClass: 'fix-error__button__icon-rotate',
        };
      case 'ADD_PTI_NOTE':
        return {
          icon: 'note_alt',
          name: 'add the missing Pre-Trip Inspection note',
          iconClass: 'fix-error__button__icon',
        };
    }
  });

  handleAction() {
    const event = this.event();
    const action = this.action();

    this.contextMenuService.handleAction(action, event);
  }
}
