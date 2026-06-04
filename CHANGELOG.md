# Changelog

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
