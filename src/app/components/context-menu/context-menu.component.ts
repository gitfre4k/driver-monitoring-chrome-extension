import { Component, Input, inject } from '@angular/core';
import { ContextMenuService } from '../../@services/context-menu.service';

import { AppService } from '../../@services/app.service';

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss'],
})
export class ContextMenuComponent {
  @Input() contextMenuItems: any;
  @Input() eventId!: number;

  contextMenuService = inject(ContextMenuService);
  appService = inject(AppService);

  tenant = this.appService.currentTenant;

  handleClick(item: string, eventId: number) {
    this.contextMenuService.handleMenuItemClick(item, this.tenant()!, eventId);
  }
}
