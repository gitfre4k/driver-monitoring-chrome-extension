import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { IEvent } from "../../interfaces/driver-daily-log-events.interface";
import { ContextMenuService } from "../../@services/context-menu.service";
import { EngineComponent } from "../UI/engine/engine.component";
import { MonitorService } from "../../@services/monitor.service";
import { PartialComponent } from "../UI/partial/partial.component";
import { ResizeComponent } from "../UI/resize/resize.component";
import { ApiOperationsService } from "../../@services/api-operations.service";
import { getStatusDuration } from "../../helpers/app.helpers";

@Component({
  selector: "app-context-menu",
  imports: [MatIconModule, EngineComponent, PartialComponent, ResizeComponent],
  templateUrl: "./context-menu.component.html",
  styleUrl: "./context-menu.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextMenuComponent {
  x = input(0);
  y = input(0);
  menuAction = output<{ action: string; event: IEvent }>();
  event = input<IEvent | null>(null);

  contextMenuService = inject(ContextMenuService);
  monitorService = inject(MonitorService);
  apiOperationsService = inject(ApiOperationsService);
  private elementRef = inject(ElementRef);

  /** Clamped position so the menu never overflows the viewport. Recomputed
   *  whenever the x/y inputs change — e.g. right-clicking a new spot while the
   *  menu is already open. */
  pos = signal<{ left: number; top: number }>({ left: 0, top: 0 });

  constructor() {
    effect(() => {
      const x = this.x();
      const y = this.y();
      // Render at the raw position first, then clamp once it has been measured.
      this.pos.set({ left: x, top: y });
      requestAnimationFrame(() => this.clampToViewport());
    });
  }

  private clampToViewport() {
    const el = this.elementRef.nativeElement.querySelector(
      ".context-menu",
    ) as HTMLElement | null;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const margin = 8;
    let left = this.x();
    let top = this.y();

    if (left + rect.width > window.innerWidth - margin)
      left = Math.max(margin, window.innerWidth - rect.width - margin);
    if (top + rect.height > window.innerHeight - margin)
      top = Math.max(margin, window.innerHeight - rect.height - margin);

    this.pos.set({ left, top });
  }

  getStatusDuration = getStatusDuration;

  /** Off Duty / Sleeper Berth status during which the shift is ready to start
   *  (a 34h reset, or a 10h+ break) — the precondition for creating a PTI. */
  canCreatePti(event: IEvent): boolean {
    return (
      ["Off Duty", "Sleeper Berth"].includes(event.statusName) &&
      (event.break === 34 || getStatusDuration(event) / 3600 >= 10)
    );
  }

  openLocationInGoogleMaps(event: IEvent) {
    return this.apiOperationsService
      .getEvent(event.tenant, event.id)
      .subscribe({
        next: (evDetails) => {
          const coordinates = `${evDetails.latitude},${evDetails.longitude}`;

          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates}`;
          chrome.tabs.create({ url: googleMapsUrl }, function (newTab) {
            console.log("Opened tab to:", newTab.url);
          });
        },
      });
  }

  duplicateEvent() {
    this.monitorService.computedDailyLogEvents.update((events) =>
      events ? events.filter((ev) => ev.id !== 0) : null,
    );
    const dupEvent = this.event();
    if (!dupEvent) return;

    this.monitorService.createDuplicatedEvent(dupEvent);
  }
}
