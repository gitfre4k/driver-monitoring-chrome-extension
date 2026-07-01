# Rework Spec (grilled 2026-07-01)

Implementation order: dependency-first. Small isolated items → foundation → big features.

## 1. Shared multi-day event engine (foundation)
- New faithful `getComputedEventsMultiDay` in `ComputeEventsService`, reusing inner `computeEvents`.
- Per-day prep (`bindEventViewId`, `e.driver`, `isLocked`, stamp each event's own `date`) BEFORE flattening.
- Algorithm: flatten → sort by `realStartTime` → dedupe by `id` dropping the copy only when `id` appears >once AND that copy has `viewId===1` → `computeEvents` once → re-inject per-day custom events → teleport + login/logout pass over full span. Breaks use each day's absolute `shiftBreak`/`cycleBreak`.
- Driver Log Analysis = FULL co-driver support (per-day co-driver fetch, own viewId stream, ~2N requests, httpLimit throttled). Co-driver identity changing mid-range = accepted limitation.
- TWO PATHS: single-day → existing per-day `getComputedEvents`; multi-day → new engine. Categorization (`handleDriverDailyLogEvents` classification) refactored to accept either.

## 2. Driver Log Analysis — Scan rework
- Extract `<app-driver-log-analysis>` with `mode` input (scan/monitor). Logic in `AdvancedScanService`.
- Scan mode: date RANGE (default 1 day), tenant multi-select (copy Log-Cert select, all selected initially), driver select only when exactly one tenant selected. "remove Engine during Driving" checkbox.
- Single-tenant path fires BOTH: `GetDrivers` (provided filter rule → all active+inactive → OPTIONS) and `getLogs` (active recent → DEFAULT-SELECTED subset, matched by numeric `id`). Fan-out over final selection. Multi-tenant = getLogs only.
- Driver option: `[driverId] driverDisplayName`, `[driverId]` fixed-width 5ch monospace, left-aligned.
- Volume gate: estimate `drivers × days × 1.5`; if > 1000 show Proceed/Cancel confirm (after driver lists resolve, before daily-log calls).
- GetDrivers payload: filterRule {AND, []}, searchRule columns [driverId, driverDisplayName, vehicleNumber] text "", sorting "driverDisplayName asc", skipCount 0, maxResultCount 1000.

## 3. Driver Log Analysis — Monitor dialog
- Monitor header menu: add "Driver Log Analysis" item + horizontal divider below it; opens dialog with mode="monitor" (selects hidden, locked to driver in view).
- Default range 8 days (today + 7 prior).
- Checkboxes: "remove Engine during Driving" + "smart fix".
- 3-phase pipeline (dynamic denominator over SELECTED phases): `1/N removing engine events during driving` → `2/N smart fix` → `N/N (8 days) driver log analysis`.
  - remove-engines failures non-fatal; smart-fix uses `smartFixClassic(rangeStart, rangeEnd)` + FMCSA retry + 6-retry guard, over selected range.
  - ABORT before analysis if smart fix throws OR returns 200 with any item carrying `errorMessage` (surface eventName+errorMessage+eventTime).
- On success → navigate to Scan Results + auto-expand monitor section.

## 4. Scan Results rendering
- Three padded groups: TOP (violations, pre-violations, low cycle hours), MIDDLE (monitor analysis), BOTTOM (all other category sections).
- Monitor analysis = exactly ONE section `[N day(s) analysis]: Driver Name`, REPLACED each run. 'x' button absolutely positioned right, before badge. Expanded: company → driver → per-category PLAIN-TEXT titles (no nested accordions) + items. Empty → "No issues found".
- Extract each category's row into shared `ng-template` used by both bottom sections and monitor section.
- Scan-mode multi-day → existing category signals → BOTTOM group (no per-driver sections).

## 5. ZIP rework
- Auto-open task queue on confirm (lift `opened` into TaskQueueService, set after dialog settles, zip-only, stays open). Phase model already exists.
- Cross-day: persist `selectedEvents` across day navigation (+ "N selected across M days" indicator + clear). Range = min/max selected `.date`. Main-driver-only. TWO PATHS (single-day core untouched; multi-day aggregated in initial compute AND processShift re-fetch).
- Two pre-checks (gate config dialog, both fire single+multi day):
  1. Co-driver conflict → HARD ERROR/abort: any co-driver event with realStartTime in range AND vehicleId ∈ range's main-driver vehicle set. (ZIP fetches co-driver logs only for guard.)
  2. Anomaly → cancel/ignore WARNING: list events with isTeleport / locationMismatch / errorMessages.length.
  - Flow: prepare (loading) → guard → warn → existing config dialog → enqueue.
- New shift rules:
  - Resize skip (direction-aware): forward → skip Driving if NEXT duty-status is PC/YM; backward → skip if PREVIOUS is PC/YM (isPcOrYm incl 2nd variants). createResizeItems gets direction.
  - Protected break blocks: accumulate consecutive Off Duty + Sleeper Berth durations (On Duty/Driving/PC/YM break block) scanning in shift direction. Thresholds {3,7,8,10,34}h. Effects: (1) block events can't be forward-end/backward-start anchor; (2) clamped so accumulated total never drops below highest band cleared (9h→≥8h, 11h→≥10h, 35h→≥34h).
- 30-min break backward bug: zipped 30-min break must end ≥ 30:00, jitter only ever adds.
- Advanced-resize dialog: disableClose true — only Yes/No resolve.

## 6. Errors (shared scan-error-list)
- Animate open/close height (keep body in DOM); one row open GLOBALLY.
- Row "Retry" = single failed request, per-item scanbar + activity-log; group "Retry failed" = batch with one summary scanbar + log. Successful retry routes through normal result-population path (violations/dot/pre at tenant level, advanced at driver/date level).

## 7. Smart Fix guard
- Cap `attemptSmartFix` at 6 retries (initial + 6 = 7 calls max) → throwError('Smart Fix retry limit reached (6)'). Guard only.

## 8. Activity Log
- Rename Console → Activity Log (component, selector, UI text). Store stays NotificationService.history.
- Add record-only `log(type, message)` (no scanbar). Monitor phases logged silently; single outcome scanbar+log.

## 9. Clear Local Chrome Memory Countdown Dialog
- Trigger: replaces silent clear at LIVE scheduled slots; missed-slot-on-open stays silent.
- 01:00 countdown, disableClose, message re reboot for clean shift slate. Reboot now / Postpone (5:00). Postpone → quiet until 00:30 left → re-trigger final 30s dialog. Reboot = clearHiddenScanData() + popUp(). Reboot at 00:00. Unlimited postpone, single instance (no stacking).

## 10. Scan cosmetics
- Horizontal divider above Violations. Tools card → mat-expansion-panel, collapsed each session (not persisted), current three children; Driver Log Analysis stays outside.

## Verify during build (non-blockers)
- (a) getLogs item `id` vs `IDriverItem.id` share id-space for default-selection mapping.
- (b) clamp-distribution detail across multi-event protected block.
