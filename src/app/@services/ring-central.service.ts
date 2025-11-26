import { Injectable, OnDestroy } from '@angular/core';
import { RingCentralC2D, WidgetEvents } from 'ringcentral-c2d';

@Injectable({
  providedIn: 'root',
})
export class RingCentralService implements OnDestroy {
  private clickToDial: RingCentralC2D | null = null;

  public initialize() {
    if (this.clickToDial) {
      console.warn('RingCentralC2D is already initialized.');
      return;
    }

    this.clickToDial = new RingCentralC2D();

    this.clickToDial.widget.on(WidgetEvents.call, (phoneNumber) => {
      console.log('Click to Call:', phoneNumber);
    });

    this.clickToDial.widget.on(WidgetEvents.text, (phoneNumber) => {
      console.log('Click to Text:', phoneNumber);
    });
  }

  ngOnDestroy(): void {
    this.dispose();
  }

  public dispose(): void {
    if (this.clickToDial) {
      this.clickToDial.dispose();
      this.clickToDial = null;
      console.log('RingCentralC2D disposed.');
    }
  }
}

// private rcService: RingCentralService
// this.rcService.initialize();
