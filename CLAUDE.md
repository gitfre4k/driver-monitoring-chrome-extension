# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build for production (default) — outputs to dist/driver-monitoring-chrome-extension/
npm run build

# Build in watch mode (development, with source maps)
npm run watch

# Serve locally (not used for extension testing — use watch + load in Chrome instead)
npm start

# Run unit tests
npm test
```

After any build, reload the unpacked extension in `chrome://extensions/` to pick up changes.

## Architecture Overview

Angular 21 Chrome extension that acts as a side-panel/popup tool for fleet safety managers working inside `app.monitoringdriver.com`. The extension communicates with the web app's active tab via Chrome messaging APIs rather than Angular routing — there are no declared routes (`app.routes.ts` is empty).

### Chrome Extension Layers

| File | Role |
|---|---|
| `src/manifest.json` | MV3 manifest — side panel + popup both use `index.html`. Content scripts injected on `app.monitoringdriver.com`. |
| `src/background.js` | Service worker. Handles `urlChanged`, `hoverEvent`, `updateLocalStorage`, `FOCUS_TACHOGRAPH_START/STOP`, `refresh`, `GET_ADMIN_PROLOGS_TOKEN` messages. Reads tenant from the web app's `localStorage` key `MASTER_TOOLS_PROVIDER_TENANT`. Retrieves ProLogs admin auth token from `admin.prologs.us` session storage. |
| `src/content-script.js` | Injected into `app.monitoringdriver.com`. Detects URL/tenant changes and forwards them to the extension via `chrome.runtime.sendMessage`. |

### Angular App Structure

**Tab navigation** (`ExtensionTabNavigationService`) drives the UI through four tabs: Scan (0), Scan Results (1), Monitor (2), Info (3). Keyboard shortcuts Ctrl+1–4 switch tabs.

**Core services and their responsibilities:**

| Service | Responsibility |
|---|---|
| `AppService` | Bootstraps the app — fetches accessible tenants, holds `tenantsSignal[]` |
| `UrlService` | Listens for `urlChanged` messages from background, maintains `tabId`, `url`, `tenant`, `provider` (`prologs`/`synergy`) signals. Routes navigation to the active tab. |
| `ApiService` | All HTTP calls to `app.monitoringdriver.com/api/*`. Uses `withCredentials: true` and sends `X-Tenant-Id` + `x-client-timezone` headers on every request. |
| `ProgressBarService` | Central state store for all scan results (violations, DOT inspections, pre-violations, cycle hours, advanced scan categories). All results are `signal<IScanResult>({})` keyed by `companyName`. |
| `ScanService` | Runs violation, pre-violation, and DOT inspection scans across all tenants. Auto-scan runs every 5 minutes via `interval(300000)`. |
| `AdvancedScanService` | Fetches driver daily logs for all tenants and classifies events into ~15 categories (teleports, location mismatch, manual driving, engine hours, malfunction, etc.) by iterating `ComputeEventsService.getComputedEvents()`. |
| `ComputeEventsService` | Pure computation layer — enriches raw `IDriverDailyLogEvents` into `IEvent[]` with derived fields (`isTeleport`, `locationMismatch`, `onDutyDuration`, `engineInfo`, etc.). |
| `MonitorService` | State for the Monitor tab — selected events, edit/resize form state, shift operations. |
| `ConstantsService` | Persisted user settings via localStorage-backed signals (`rightSide`, `ptiName`, `hiddenViolations`, `httpLimit`). |
| `BackgroundJsService` | Wraps all `chrome.runtime.sendMessage` calls into Observables. |
| `BackendService` | Loads shift report and archive data from the ProLogs backend cloud service. |

### Scan Modes (`TScanMode`)

`'violations'` | `'pre'` | `'dot'` | `'advanced'` | `'cert'` | `'deleteUE'` | `'admin'` | `'smartFix'`

Each mode has a dedicated `initializeState(scanMode)` branch in `ProgressBarService` that resets the relevant signals before a scan starts.

### Multi-tenant Pattern

All scan operations:
1. Call `ApiService.getAccessibleTenants()` — two hardcoded tenant IDs are required; if absent the extension closes itself.
2. Fan out with `mergeMap`/`concatMap` per tenant, passing `X-Tenant-Id` header each time.
3. Accumulate results keyed by `tenant.name` or `company.name` into `ProgressBarService` signals.

`ConstantsService.httpLimit` (default `2`) controls concurrency via the third `mergeMap` argument.

### UI Components

- `src/app/components/UI/` — small, single-purpose action/status components (duty status buttons, dialogs, time/location inputs)
- `src/app/components/monitor/` — Monitor tab with event list, edit form, resize form, fix button, action buttons
- `src/app/components/scan/` + `scan-result/` — Scan tab UI and results display
- `src/app/components/cloud/` — Cloud/shift report view

All components use `ChangeDetectionStrategy.OnPush` and Angular signals.

### Key Interfaces

- `IEvent` (`driver-daily-log-events.interface.ts`) — the central enriched event object used throughout the monitor and advanced scan
- `ITenant` — extends `ICompany` with `{ id, name }`, passed with every API call
- `IScanResult` — `{ [companyName: string]: IScanResultDriver[] }` — the shape of all advanced scan output signals
- Types live in `src/app/types/index.ts`; interfaces split across `src/app/interfaces/`

### Styling

SCSS per component. Global styles in `src/styles.scss`. Angular Material cyan-orange prebuilt theme. No custom theme configuration.

### Formatter

Prettier 3.6. Config in `.prettierrc`.
