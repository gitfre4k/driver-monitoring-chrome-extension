import { Injectable, signal, Signal } from '@angular/core';

export interface PanelAction {
  action: 'open' | 'close' | 'toggle';
}

@Injectable({
  providedIn: 'root',
})
export class PanelService {
  violationPanelIsOpened = signal(false);
}
