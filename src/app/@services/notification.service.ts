import { inject, Injectable, signal } from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarConfig,
  MatSnackBarRef,
  TextOnlySnackBar,
} from '@angular/material/snack-bar';
import { DateTime } from 'luxon';

export type TNotificationType = 'info' | 'success' | 'warning' | 'error';

export interface INotification {
  id: number;
  type: TNotificationType;
  message: string;
  /** Wall-clock time the notification was raised, HH:mm:ss. */
  time: string;
}

/** Extra options on top of the standard snack-bar config. */
export interface INotifyConfig extends MatSnackBarConfig {
  /** Action button label. Defaults to `'OK'`. */
  action?: string;
}

/** Default auto-dismiss duration (ms) per notification type. */
const DEFAULT_DURATION: Record<TNotificationType, number> = {
  info: 3000,
  success: 3000,
  warning: 5000,
  error: 7000,
};

/**
 * Central entry point for every user-facing notification.
 *
 * Wraps `MatSnackBar` so each message is (a) styled by type via a panelClass
 * and (b) recorded into an in-memory `history` log that the Console drawer
 * renders. Always raise notifications through this service — never call
 * `MatSnackBar` directly — so they appear in the Console.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  /** Notification log, newest first. Lives for the current session only. */
  readonly history = signal<INotification[]>([]);

  private id = 0;

  info(message: string, config?: INotifyConfig) {
    return this.show('info', message, config);
  }

  success(message: string, config?: INotifyConfig) {
    return this.show('success', message, config);
  }

  warning(message: string, config?: INotifyConfig) {
    return this.show('warning', message, config);
  }

  error(message: string, config?: INotifyConfig) {
    return this.show('error', message, config);
  }

  /** Clears the notification history shown in the Console. */
  clear() {
    this.history.set([]);
  }

  private show(
    type: TNotificationType,
    message: string,
    config: INotifyConfig = {},
  ): MatSnackBarRef<TextOnlySnackBar> {
    this.record(type, message);

    const { action = 'OK', panelClass, ...rest } = config;

    return this.snackBar.open(message, action, {
      duration: DEFAULT_DURATION[type],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      ...rest,
      panelClass: [
        'app-snackbar',
        `app-snackbar--${type}`,
        ...(Array.isArray(panelClass) ? panelClass : panelClass ? [panelClass] : []),
      ],
    });
  }

  private record(type: TNotificationType, message: string) {
    this.history.update((prev) => [
      {
        id: ++this.id,
        type,
        message,
        time: DateTime.now().toFormat('HH:mm:ss'),
      },
      ...prev,
    ]);
  }
}
