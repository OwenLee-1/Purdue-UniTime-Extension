# Beta 1.2.0 — Tester feedback UX pass

**Tag:** `v1.2.0-beta`  
**Date:** June 2026  
**Status:** Public beta — side panel UX, compact badges, calendar fixes, settings page.

Prior release: [`BETA_1.1.0.md`](./BETA_1.1.0.md) · tag `v1.1.0-beta`.

## What's new

### Professor details (side panel)
- **Replaced hover popover** with a **right-hand panel** (full viewport height, scrollable, never clipped by the tab).
- **Structured layout:** hero RMP + GPA cards, table-style detail rows, clear section headings.
- **Shorter review previews** (140 chars, 2 lines) plus **“Read all reviews on RateMyProfessors”** link.
- **Click badge** to open; click again or backdrop/✕ to close.

### Inline badge
- Shows **`★ RMP · GPA`** at a glance (composite ◎ symbol removed from pill).

### Calendar export
- Separate **Google**, **Apple** (`webcal://` via `chrome.tabs`), and **Outlook web** buttons.
- URL saves on paste; strips wrapping quotes; warns on non-Purdue URLs.

### Settings
- Full **options page** (`chrome://extensions` → extension → Details → Extension options) with display toggles, cache clear, and coming-soon placeholders.
- **Settings** link in popup.

### Matching
- Stricter instructor detection: rejects course-title phrases, subject-only tokens, long non-initial names.
- Reads instructor **link text** from UniTime cells when available.

## Install

1. Download **`purdue-rmp-extension-v1.2.0-beta.zip`** from [Releases](https://github.com/OwenLee-1/Purdue-UniTime-Extension/releases).
2. Unzip → `chrome://extensions` → **Load unpacked**.
3. Popup → **Clear cached ratings** → reload UniTime.
4. Console: `[Purdue RMP] build 1.2.0-beta`.

## Verify

1. Inline badges show `★ X.X · Y.YY GPA` where data exists.
2. **Click** a badge → right panel opens with table layout and scroll.
3. Popup calendar: paste iCal URL → try Google / Apple / Outlook.
4. Open **Settings** from popup or extension options page.

## Known limitations / deferred

Superseded in [`BETA_1.3.0.md`](./BETA_1.3.0.md): hover preview restored, AI summaries, auto iCal.

- Google Calendar subscribe may fail if Purdue's feed requires an active browser session (server-side fetch).
