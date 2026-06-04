# Beta 1.0.0 — Known-good baseline

**Tag:** `v1.0.0-beta`  
**Date:** June 2026  
**Status:** First public beta checkpoint — inline RMP + course GPA on Purdue UniTime, verified working after RMP connectivity and matching fixes.

Use this release as the rollback reference if later work breaks lookups or the hover UI.

## What works in this build

- Inline badges on `timetable.mypurdue.purdue.edu` with composite score and per-course GPA
- Hover card: RMP rating, difficulty, would-take-again, tags, recent comments, grade distribution
- RateMyProfessors lookups via background worker (with offscreen fallback and header rules for Chrome MV3)
- Bundled BoilerGrades GPA data (offline, per course + instructor)
- Conservative name matching (ambiguous names show `?`, not a wrong professor)
- Course-aware disambiguation (e.g. AAE → Aerospace Engineering on RMP)
- Shared RMP cache across duplicate professor rows / multiple sections
- Hide professor, personal marks (like/dislike, taken, note), best-section highlight
- Popup: enable/disable, debug mode, clear cache, calendar export links

## Install (testers & developers)

```bash
npm install
npm run build
```

1. Open `chrome://extensions` → **Developer mode** → **Load unpacked** → select the **`dist/`** folder (not the repo root).
2. Extension popup → **Clear cached ratings** → reload the UniTime tab.
3. Confirm the browser console shows: `[Purdue RMP] build 1.0.0-beta`.

## Verify RMP is connected

1. Turn on **Debug** in the popup.
2. Open DevTools on the UniTime tab; look for `rmpStatus: "ok"` and a numeric `overall` for known professors (e.g. `S Weng`, `T F Cunningham`).
3. If RMP fails, check the service worker console on `chrome://extensions` for `[Purdue RMP]` errors. A `400` cookie/header error should be resolved in this build (`credentials: 'omit'` + cookie stripping on GraphQL).

## Known limitations

- **Initial-only names:** UniTime strings like `P P Cunningham` may not match anyone on RMP if no profile shares those initials; `T F Cunningham` → Thomas Cunningham is the expected match for AAE.
- **Ambiguous last names:** Multiple strong RMP matches → no star (by design).
- **Staff / TBA:** No badge.
- **Campus network:** Some networks block `ratemyprofessors.com`; try another connection if all professors show `fetch_failed`.
- **Load path:** Must load **`dist/`** after every `npm run build`; loading the repo root will not bundle modules correctly.

## Technical snapshot (for maintainers)

| Area | Location |
|------|----------|
| RMP GraphQL + matching | `src/core/providers/rmpProvider.js`, `src/core/matching.js` |
| RMP network (MV3) | `rules/rmp_headers.json`, `src/background/rmpNetRules.js`, `src/background/offscreenFetch.js` |
| Batched lookups | `src/content/lookup.js` |
| Merge RMP + GPA | `src/core/mergeResult.js` |
| Build | `npm run build` → Vite + `@crxjs/vite-plugin` → `dist/` |

## Changelog since alpha

- Background-only RMP fetch (UniTime blocks page-context requests)
- Parallel RMP batching with rate limiting
- Fix RMP `400 Request Header Or Cookie Too Large` (omit cookies, DNR header rules)
- Fix single-initial false positives in name matching
- Multi-initial names (`P P Last`) and course-department hints
- Duplicate-row RMP cache sharing and professor-ready refresh hooks
- Offscreen document fallback when service worker fetch fails

## Next steps (post–1.0.0-beta)

See [`BETA_PLAN.md`](./BETA_PLAN.md) for Phase B2+ (personal layer polish, schedule planner, etc.).
