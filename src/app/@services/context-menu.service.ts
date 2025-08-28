import { inject, Injectable, signal } from '@angular/core';
import { ApiOperationsService } from './api-operations.service';
import { ITenant } from '../interfaces';

@Injectable({
  providedIn: 'any',
})
export class ContextMenuService {
  apiOperationsService = inject(ApiOperationsService);

  isDisplayContextMenu = signal(false);
  rightClickMenuItems: string[] = [];
  rightClickMenuPositionX!: number;
  rightClickMenuPositionY!: number;

  displayContextMenu($event: MouseEvent) {
    this.isDisplayContextMenu.set(true);

    this.rightClickMenuItems = ['add Pre-Trip Inspection'];

    this.rightClickMenuPositionX = $event.clientX;
    this.rightClickMenuPositionY = $event.clientY;
  }

  getRightClickMenuStyle() {
    return {
      position: 'fixed',
      left: `${this.rightClickMenuPositionX}px`,
      top: `${this.rightClickMenuPositionY}px`,
    };
  }

  handleMenuItemClick(item: string, tenant: ITenant, eventId: number) {
    console.log('zzzzzzzzzzzzzzzzzzzzzzzzz', eventId);

    console.log('add Pre-Trip Inspection', tenant.id);
    this.apiOperationsService
      .updateEvent(tenant, eventId, 10)
      .subscribe((data) => console.log(data));
  }
}
