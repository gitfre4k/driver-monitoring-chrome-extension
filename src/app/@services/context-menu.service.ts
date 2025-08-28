import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ContextMenuService {
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

  handleMenuItemClick(event: any) {
    console.log(event.data);
    switch (event.data) {
      case 'add Pre-Trip Inspection':
        console.log('add Pre-Trip Inspection');
        break;
      default:
        return;
    }
  }
}
