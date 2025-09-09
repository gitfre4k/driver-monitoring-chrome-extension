import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TContextMenuAction } from '../../../types';

@Component({
  selector: 'app-monitor-menu',
  imports: [MatIconModule],
  templateUrl: './monitor-menu.component.html',
  styleUrl: './monitor-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitorMenuComponent {
  @Input() numOfSelectedEvents = 0;
  @Output() menuAction = new EventEmitter<TContextMenuAction>();
  @Output() shiftAction = new EventEmitter();

  onMenuAction(action: TContextMenuAction) {
    this.menuAction.emit(action);
  }
  onShiftAction() {
    this.shiftAction.emit();
  }
}
