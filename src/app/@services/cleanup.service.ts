import { inject, Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { MatDialog } from '@angular/material/dialog';
import { ConstantsService } from './constants.service';
import {
  ClearMemoryDialogComponent,
  TClearMemoryResult,
} from '../components/UI/clear-memory-dialog/clear-memory-dialog.component';

/**
 * Periodically clears the persisted "hidden item" records from the Scan Results
 * page. Cleanup is scheduled three times a day in Central European Summer Time
 * (Europe/Berlin, DST-safe): 06:15, 14:15 and 22:15.
 *
 * A Chrome extension cannot run a true background scheduler while its window is
 * closed, so this service combines two mechanisms:
 *   1. A catch-up run on extension open when the most recent slot was missed —
 *      this stays SILENT (immediate `runCleanup`, no dialog).
 *   2. setTimeout-based timers while the window stays open. When a slot fires
 *      LIVE (window open) it opens a countdown dialog instead of clearing
 *      silently, giving the operator a chance to reboot for a clean shift slate
 *      or postpone.
 *
 * The timestamp of the last cleanup is persisted in localStorage (via
 * ConstantsService) so the catch-up survives across sessions.
 */
@Injectable({ providedIn: 'root' })
export class CleanupService {
  private constantsService = inject(ConstantsService);
  private dialog = inject(MatDialog);

  /** Scheduled slots as { hour, minute } in the Europe/Berlin zone. */
  private readonly zone = 'Europe/Berlin';
  private readonly slots: { hour: number; minute: number }[] = [
    { hour: 6, minute: 15 },
    { hour: 14, minute: 15 },
    { hour: 22, minute: 15 },
  ];

  /** Countdown lengths (seconds) for the initial and post-postpone dialogs. */
  private readonly initialCountdown = 60;
  private readonly finalCountdown = 30;
  /** Postpone length (ms). The dialog re-appears when `finalCountdown` remains. */
  private readonly postponeMs = 5 * 60 * 1000;

  private timer: ReturnType<typeof setTimeout> | null = null;
  private postponeTimer: ReturnType<typeof setTimeout> | null = null;
  /** True from the first countdown dialog until the reboot — prevents a second
   *  slot (or a repeat) from stacking a parallel countdown cycle. */
  private cycleActive = false;

  /** Run the catch-up check, then schedule the next slot. */
  initialize() {
    this.catchUpOnInit();
    this.scheduleNext();
  }

  /** Perform the cleanup silently and record when it happened. */
  runCleanup() {
    this.constantsService.clearHiddenScanData();
    this.constantsService.lastHiddenCleanup.set(DateTime.now().toISO());
  }

  /** The most recent slot datetime that is at or before "now". */
  private mostRecentSlot(): DateTime {
    const now = DateTime.now().setZone(this.zone);
    const candidates = this.slots.map(({ hour, minute }) =>
      now.set({ hour, minute, second: 0, millisecond: 0 }),
    );
    // Any slot still in the future today belongs to yesterday's schedule.
    const past = candidates
      .map((dt) => (dt <= now ? dt : dt.minus({ days: 1 })))
      .sort((a, b) => b.toMillis() - a.toMillis());
    return past[0];
  }

  /** The next upcoming slot datetime strictly after "now". */
  private nextSlot(): DateTime {
    const now = DateTime.now().setZone(this.zone);
    const upcoming = this.slots
      .map(({ hour, minute }) => {
        const dt = now.set({ hour, minute, second: 0, millisecond: 0 });
        return dt > now ? dt : dt.plus({ days: 1 });
      })
      .sort((a, b) => a.toMillis() - b.toMillis());
    return upcoming[0];
  }

  /** Run cleanup now (silently) if it hasn't run since the most recent slot. */
  private catchUpOnInit() {
    const last = this.constantsService.lastHiddenCleanup();
    const lastDt = last ? DateTime.fromISO(last) : null;
    if (!lastDt || lastDt < this.mostRecentSlot()) {
      this.runCleanup();
    }
  }

  /** Arm a timer for the next slot; re-arm after it fires. */
  private scheduleNext() {
    if (this.timer) clearTimeout(this.timer);
    const ms = Math.max(0, this.nextSlot().toMillis() - DateTime.now().toMillis());
    this.timer = setTimeout(() => {
      this.triggerLiveSlot();
      this.scheduleNext();
    }, ms);
  }

  /** A slot fired while the window is open: start a countdown cycle (unless one
   *  is already running — no stacking). */
  private triggerLiveSlot() {
    if (this.cycleActive) return;
    this.cycleActive = true;
    this.openCountdownDialog(this.initialCountdown);
  }

  /** Open the countdown dialog; resolve reboot vs. postpone. Single instance —
   *  the postpone chain always opens exactly one dialog at a time. */
  private openCountdownDialog(seconds: number) {
    const ref = this.dialog.open(ClearMemoryDialogComponent, {
      disableClose: true,
      data: { startSeconds: seconds },
    });

    ref.afterClosed().subscribe((result: TClearMemoryResult | undefined) => {
      if (result === 'postpone') {
        this.schedulePostpone();
      } else {
        // 'reboot' or countdown reaching 00:00.
        this.reboot();
      }
    });
  }

  /** Postpone: stay quiet for the postpone window, then re-open the final 30s
   *  dialog. Unlimited postpones (each postpone re-arms this). */
  private schedulePostpone() {
    if (this.postponeTimer) clearTimeout(this.postponeTimer);
    const quietMs = Math.max(0, this.postponeMs - this.finalCountdown * 1000);
    this.postponeTimer = setTimeout(
      () => this.openCountdownDialog(this.finalCountdown),
      quietMs,
    );
  }

  /** Clear local memory and reboot the extension window (clean shift slate). */
  private reboot() {
    if (this.postponeTimer) clearTimeout(this.postponeTimer);
    this.cycleActive = false;
    this.runCleanup();
    this.popUp();
  }

  /**
   * Reopen the extension in a fresh window and close the current one — mirrors
   * `AppComponent.popUp()`. Used to reboot into a clean state after cleanup.
   */
  private popUp() {
    const rightSide = this.constantsService.rightSide();
    const height = window.screen.availHeight;
    const windowFeatures = `width=444,height=${height},left=${rightSide ? 6846845 : 0},top=0`;
    window.open('index.html', '', windowFeatures);
    window.close();
  }
}
