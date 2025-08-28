import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { ContextMenuService } from '../../@services/context-menu.service';
// import { ContextMenuModel } from "../Interfaces/context-menu-model";

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss'],
})
export class ContextMenuComponent {
  @Input()
  contextMenuItems: any;

  @Output()
  onContextMenuItemClick: EventEmitter<any> = new EventEmitter<any>();

  contextMenuService = inject(ContextMenuService);

  // onContextMenuClick(event, data): any {
  //   this.onContextMenuItemClick.emit({
  //     event,
  //     data,
  //   });
  // }
}
