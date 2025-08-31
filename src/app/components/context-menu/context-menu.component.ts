import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IEvent } from '../../interfaces/driver-daily-log-events.interface';
import { ContextMenuService } from '../../@services/context-menu.service';
import { EngineComponent } from '../UI/engine/engine.component';

@Component({
  selector: 'app-context-menu',
  imports: [MatIconModule, EngineComponent],
  templateUrl: './context-menu.component.html',
  styleUrl: './context-menu.component.scss',
})
export class ContextMenuComponent {
  @Input() x = 0;
  @Input() y = 0;
  @Output() menuAction = new EventEmitter<{ action: string; event: IEvent }>();
  @Input() event: IEvent | null = null;

  contextMenuService = inject(ContextMenuService);
}
