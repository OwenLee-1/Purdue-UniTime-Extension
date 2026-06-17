# Changelog

## [1.3.2-beta] — 2026-06-16

UniTime freeze and sidebar interaction fixes on top of 1.3.1.

### Added

- Physical freeze layer + capture-phase guards so UniTime mini popups stay open while using RMP UI
- MAIN-world `page-shield.js` to block GWT outside-click and Escape dismiss handlers during freeze
- Pointer-zone hit testing for backdrop vs sidebar vs UniTime popup layering

### Fixed

- Sidebar renders on-page (iframes blocked by UniTime CSP); close button and outside-click dismiss work
- Closing sidebar via ✕, Escape, or backdrop no longer dismisses open UniTime class-option popups
- Removed inline script injection that violated UniTime CSP

## [1.3.1-beta] — 2026-06-04

Course-scoped RMP reviews. See [`BETA_1.3.1.md`](./BETA_1.3.1.md).

### Added

- Match RMP review class tags to the UniTime course being viewed
- Course-specific RMP average, sentiment, and comments in panel/hover when n ≥ 3 tagged reviews
- Fallback to overall RMP + all recent reviews when no course matches in the latest fetch

## [1.3.0-beta] — 2026-06-04

Alpha feedback completion: hover preview restored, AI summaries, auto iCal. See [`BETA_1.3.0.md`](./BETA_1.3.0.md).

### Added

- Hover preview card on badge hover (read-only glance) alongside click-to-open side panel
- AI-shortened RMP comments in hover preview and side panel (Chrome Summarizer + fallback)
- Auto-detect UniTime iCalendar URL from export dialog, page scan, and clipboard
- Settings toggle for AI review summaries; calendar auto-detect status on options page

### Changed

- Professor UX: hover = preview, click = full panel (replaces click-only 1.2.0 behavior)
- Popup and README copy updated for hover + panel workflow

## [1.2.0-beta] — 2026-06-04

Alpha tester UX pass. See [`BETA_1.2.0.md`](./BETA_1.2.0.md).

### Changed

- Hover popover → click-to-open right-hand professor panel (full-height, scrollable)
- Badge shows `★ RMP · GPA` instead of composite ◎ symbol
- Review previews shortened; link to full RMP discussion
- Stricter instructor name detection (course titles, subject tokens, cell link text)
- Calendar export: separate Google / Apple / Outlook web; `chrome.tabs` for `webcal://`

### Added

- Settings / options page with display toggles and coming-soon sections
- Settings link in popup

### Fixed

- npm high-severity rollup advisory via package override (dev dependency)

## [1.1.0-beta] — 2026-06-04

Hover card polish and richer review data. See [`BETA_1.1.0.md`](./BETA_1.1.0.md).

### Changed

- Removed composite breakdown weight/signal rows from hover card
- Fetch 12 recent RMP ratings (was 4); show up to 5 comment snippets (was 3)
- Review sentiment uses all fetched star ratings (n up to 12, shown when n ≥ 3)
- RMP cache bumped to v6; stale entries without `recentRatings` are refetched

### Added

- GitHub Actions workflow to build and attach extension zip on `v*` tags

## [1.0.0-beta] — 2026-06-03

First documented beta baseline. See [`BETA_1.0.0.md`](./BETA_1.0.0.md) for install, verification, and known limitations.

### Added

- Background worker RMP + GPA batch lookups (`lookup.js`, service worker messaging)
- Chrome MV3 RMP connectivity: static DNR header rules, offscreen fetch fallback
- Course-aware RMP disambiguation and improved multi-initial name parsing
- Shared in-page RMP cache for duplicate professor rows
- Composite score, review snippets, and grade distribution in hover card

### Fixed

- RMP `fetch_failed` from extension context (cookies / oversized headers → 400)
- Wrong matches from loose single-letter first-name scoring
- Duplicate sections missing RMP after first row loaded

## Earlier (alpha)

See git history before `v1.0.0-beta` for alpha inline badges, calendar export, and initial RMP/GPA integration.
