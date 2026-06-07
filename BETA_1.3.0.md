# Beta 1.3.0 — Hover preview, AI summaries, auto iCal

**Tag:** `v1.3.0-beta`  
**Date:** June 2026  
**Status:** Public beta — completes alpha feedback items from 1.2.0 plus hover restore.

Prior release: [`BETA_1.2.0.md`](./BETA_1.2.0.md) · tag `v1.2.0-beta`.

## What's new

### Hover preview + click panel
- **Hover** a badge → compact read-only preview (RMP, GPA, sentiment, up to 2 comments, tags).
- **Click** a badge → full right-hand panel (marks, hide professor, all reviews, actions).
- Preview shows **“Click badge for full panel →”**; panel closes preview automatically.

### AI-shortened review comments
- Hover preview and side panel shorten long RMP comments using **Chrome's built-in Summarizer** (Gemini Nano) when available.
- Falls back to sentence-aware truncation if Summarizer is unavailable.
- Toggle in **Settings → AI-shorten review comments** (on by default).

### Calendar auto-detect
- While you browse UniTime, the extension watches for **iCalendar export URLs** (export dialog, page DOM, clipboard copy).
- Saved URL appears in the popup; manual paste still works.
- **Google / Apple / Outlook** buttons unchanged.

### Carried over from 1.2.0 (first public tag for these)
- Right-hand professor panel, compact `★ RMP · GPA` badge, settings page, calendar buttons, stricter instructor detection, npm audit fix.

## Install

1. Download **`purdue-rmp-extension-v1.3.0-beta.zip`** from [Releases](https://github.com/OwenLee-1/Purdue-UniTime-Extension/releases).
2. Unzip → `chrome://extensions` → **Load unpacked** → select the unzipped folder.
3. Popup → **Clear cached ratings** → reload UniTime.
4. Console: `[Purdue RMP] build 1.3.0-beta`.

Upgrading from 1.1.0 or 1.2.0: reload the extension from the new zip, clear cache once, refresh UniTime.

## Verify

1. **Badge** — `★ 4.2 · 3.15 GPA` (or similar) next to instructors.
2. **Hover** — preview card appears after a brief pause; comments should shorten (or truncate) within a second.
3. **Click** — full side panel opens; scroll to bottom works; ✕ or backdrop closes.
4. **iCal** — UniTime → Export → iCalendar → open popup; URL filled with “Auto-detected from UniTime”.
5. **Settings** — Extension options → AI toggle, calendar status line.

## AI summaries (optional)

Chrome **138+** desktop with **built-in AI / Gemini Nano** enabled. If summaries stay truncated-only, check `chrome://flags` / Chrome AI settings or turn the toggle off in extension settings.

## Known limitations

- **Google Calendar subscribe** may fail if Purdue's feed requires an active myPurdue session — paste the URL into Google Calendar manually if one-click fails.
- **Summarizer** is device- and Chrome-version dependent; not available in all browsers.
- **Instructor detection** is improved but not perfect — report wrong matches via popup or GitHub Issues.
- **Export/import personal marks** — still deferred.
