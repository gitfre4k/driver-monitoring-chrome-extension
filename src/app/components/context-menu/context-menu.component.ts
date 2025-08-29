import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-context-menu',
  imports: [],
  templateUrl: './context-menu.component.html',
  styleUrl: './context-menu.component.scss',
})
export class ContextMenuComponent {
  @Input() x = 0;
  @Input() y = 0;
  @Output() menuAction = new EventEmitter<{ action: string; item: any }>();
  @Input() item: any;

  handleAction(action: string) {
    this.menuAction.emit({ action, item: this.item });
  }
}
