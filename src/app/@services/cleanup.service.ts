import { inject, Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { ConstantsService } from './constants.service';

/**
 * Periodically clears the persisted "hidden item" records from the Scan Results
 * page. Cleanup is scheduled three times a day in Central European Summer Time
 * (Europe/Berlin, DST-safe): 06:15, 14:15 and 22:15.
 *
 * A Chrome extension cannot run a true background scheduler while its window is
 * closed, so this service combines two mechanisms:
 *   1. A catch-up run on extension open when the most recent slot was missed.
 *   2. setTimeout-based timers while the window stays open.
 *
 * The timestamp of the last cleanup is persisted in localStorage (via
 * ConstantsService) so the catch-up survives across sessions.
 */
@Injectable({ providedIn: 'root' })
export class CleanupService {
  private constantsService = inject(ConstantsService);

  /** Scheduled slots as { hour, minute } in the Europe/Berlin zone. */
  private readonly zone = 'Europe/Berlin';
  private readonly slots: { hour: number; minute: number }[] = [
    { hour: 6, minute: 15 },
    { hour: 14, minute: 15 },
    { hour: 22, minute: 15 },
  ];

  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Run the catch-up check, then schedule the next slot. */
  initialize() {
    this.catchUpOnInit();
    this.scheduleNext();
  }

  /** Perform the cleanup and record when it happened. */
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

  /** Run cleanup now if it hasn't run since the most recent scheduled slot. */
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
      this.runCleanup();
      this.scheduleNext();
    }, ms);
  }
}
