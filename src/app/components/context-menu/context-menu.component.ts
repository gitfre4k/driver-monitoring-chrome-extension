import { Component, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IEvent } from '../../interfaces/driver-daily-log-events.interface';
import { ContextMenuService } from '../../@services/context-menu.service';
import { EngineComponent } from '../UI/engine/engine.component';
import { MonitorService } from '../../@services/monitor.service';
import { PartialComponent } from '../UI/partial/partial.component';
import { ResizeComponent } from '../UI/resize/resize.component';

@Component({
  selector: 'app-context-menu',
  imports: [MatIconModule, EngineComponent, PartialComponent, ResizeComponent],
  templateUrl: './context-menu.component.html',
  styleUrl: './context-menu.component.scss',
})
export class ContextMenuComponent {
  x = input(0);
  y = input(0);
  menuAction = output<{ action: string; event: IEvent }>();
  event = input<IEvent | null>(null);

  contextMenuService = inject(ContextMenuService);
  monitorService = inject(MonitorService);
}
