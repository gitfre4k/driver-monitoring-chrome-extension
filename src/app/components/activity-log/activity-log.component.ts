import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  NotificationService,
  TNotificationType,
} from '../../@services/notification.service';

@Component({
  selector: 'app-activity-log',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './activity-log.component.html',
  styleUrl: './activity-log.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityLogComponent {
  private notification = inject(NotificationService);
  private elementRef = inject(ElementRef);

  readonly opened = signal(false);

  /** Scrollable log list element (present only while the panel is open). */
  private readonly logEl = viewChild<ElementRef<HTMLUListElement>>('log');

  constructor() {
    // Keep the log pinned to the bottom (newest entry) whenever the panel opens
    // or a new notification arrives.
    afterRenderEffect(() => {
      this.opened();
      this.orderedHistory();
      const el = this.logEl()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  /** Close the panel when a click lands outside this component. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (
      this.opened() &&
      !this.elementRef.nativeElement.contains(event.target as Node)
    ) {
      this.opened.set(false);
    }
  }
  readonly history = this.notification.history;
  readonly count = computed(() => this.history().length);

  /** History ordered oldest → newest so the most recent log sits at the bottom. */
  readonly orderedHistory = computed(() => this.history().slice().reverse());

  /** Material icon name shown for each notification type. */
  private readonly icons: Record<TNotificationType, string> = {
    info: 'info',
    success: 'check_circle',
    warning: 'warning',
    error: 'error',
  };

  icon(type: TNotificationType): string {
    return this.icons[type];
  }

  toggle() {
    this.opened.update((value) => !value);
  }

  clear() {
    this.notification.clear();
  }
}
