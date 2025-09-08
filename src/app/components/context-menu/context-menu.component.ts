import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IEvent } from '../../interfaces/driver-daily-log-events.interface';
import { ContextMenuService } from '../../@services/context-menu.service';
import { EngineComponent } from '../UI/engine/engine.component';
import { SleeperBerthComponent } from '../UI/sleeper-berth/sleeper-berth.component';
import { OnDutyComponent } from '../UI/on-duty/on-duty.component';
import { DrivingComponent } from '../UI/driving/driving.component';
import { OffDutyComponent } from '../UI/off-duty/off-duty.component';
import { ResizeComponent } from '../UI/resize/resize.component';
import { MonitorService } from '../../@services/monitor.service';
// import { ToOffComponent } from '../UI/to-off/to-off.component';
// import { ToSleeperComponent } from '../UI/to-sleeper/to-sleeper.component';

@Component({
  selector: 'app-context-menu',
  imports: [
    MatIconModule,
    EngineComponent,
    SleeperBerthComponent,
    OnDutyComponent,
    DrivingComponent,
    OffDutyComponent,
    ResizeComponent,
  ],
  templateUrl: './context-menu.component.html',
  styleUrl: './context-menu.component.scss',
})
export class ContextMenuComponent {
  @Input() x = 0;
  @Input() y = 0;
  @Output() menuAction = new EventEmitter<{ action: string; event: IEvent }>();
  @Input() event: IEvent | null = null;

  contextMenuService = inject(ContextMenuService);
  monitorService = inject(MonitorService);
}
