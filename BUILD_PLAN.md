# Purdue RMP Extension — Technical Build Plan

A Chrome extension (Manifest V3) that overlays RateMyProfessors ratings inline on
Purdue's UniTime scheduling site (`timetable.mypurdue.purdue.edu`), so students can
compare professors without leaving the page.

## 1. Tech stack & tooling

| Concern | Choice | Why |
|---|---|---|
| Manifest | Manifest V3 | Required for new Chrome Web Store submissions |
| Language | Plain modern JavaScript (ES modules) | Beginner-friendly; no build-time type system to learn |
| Bundler | Vite + `@crxjs/vite-plugin` | Fast HMR, handles MV3 packaging |
| UI | Vanilla JS for injected badges; small popup/options pages | Injected content must be tiny & not clash with GWT DOM |
| Styling | Scoped CSS via **Shadow DOM** | Isolates our UI from UniTime's global GWT styles |
| Type clarity | JSDoc `@typedef` comments | Documents data shapes without needing TypeScript |

Key UI decision: render the badge + popover inside a **Shadow DOM** so GWT's global
styles can't break our UI and vice versa.

## 2. Directory structure

```
purdue-rmp-extension/
├── manifest / vite config
├── src/
│   ├── content/        # observer, detection, injection, badge + popover UI
│   ├── background/     # service worker: message router, fetch, cache owner
│   ├── core/           # types, matching, cache, providers (RMP = v1's only one)
│   ├── popup/          # toolbar popup (on/off, debug, report match)
│   └── options/        # settings
├── public/icons/
└── tests/              # matching + provider unit tests
```

## 3. Architecture

- **Content script** runs on UniTime. A debounced `MutationObserver` finds instructor
  cells (GWT renders async + re-renders on sort/tab/dialog), injects a Shadow-DOM badge.
- **Background service worker** performs RMP GraphQL fetches (it holds the
  `ratemyprofessors.com` host permission, so the content script avoids CORS) and owns
  the cache.
- They communicate via `chrome.runtime.sendMessage`.

## 4. The provider contract (the extensibility seam)

All data sources extend one small base class and return the same `ProviderResult` shape
(documented with JSDoc `@typedef`, no TypeScript). v1 ships only the RMP provider; future
versions (grade distributions, Reddit sentiment) register additional providers without
touching detection/injection/UI.

```js
class RatingProvider {
  // id: "rmp" | "grades" | "reddit"
  // async lookup(query) -> Promise<ProviderResult>
}
```

## 5. Name matching (highest-leverage module)

1. Normalize the UniTime string (`"Last, First M."` → `{first, last}`, strip titles/diacritics).
2. Fetch candidates from RMP scoped to Purdue's school ID.
3. Score (last-name exact + first-name/initial + optional department).
4. Confidence rule: single strong → render; multiple/weak → ambiguous (neutral marker);
   none → no_match. Skip `Staff`/`TBA`.

Conservative by design: better to show nothing than the wrong professor (defamation risk).

## 6. RMP provider

- `POST https://www.ratemyprofessors.com/graphql`, public Basic auth header.
- Resolve Purdue's school ID once (cache), then teacher-search query scoped to it.
- Fields: `avgRating`, `avgDifficulty`, `wouldTakeAgainPercent`, `numRatings`,
  `firstName`/`lastName`, `department`, `legacyId` (profile URL).
- Exact fields + Purdue school ID confirmed in the discovery spike (unofficial API).

## 7. Caching

- `chrome.storage.local`, keyed by normalized professor identity.
- TTL ~7d for hits; ~1d negative-cache for `no_match`; school ID cached ~indefinitely.

## 8. Milestones

- **M0 — Discovery spike**: confirm UniTime instructor-cell selectors + RMP school ID,
  fields, and match rate against ~10 real Purdue names.
- **M1 — Skeleton**: Vite + MV3 scaffold; content script logs detected instructor names.
- **M2 — Detection solid**: observer survives sort/tab/dialog; dummy static badges.
- **M3 — Real RMP data**: worker + provider + matching + cache; real color-coded badges.
- **M4 — Popover + no-match states**: hover card; neutral marker; debug error codes.
- **M5 — Multi-section comparison**: highlight best-rated prof for a course.
- **M6 — Popup/options + polish**: toggles, debug mode, report-wrong-match, Web Store assets.
- **M7 — Launch**: Web Store + r/Purdue post timed to registration season.

Future (post-backbone): grade-distribution provider → Reddit sentiment → multi-school.

## 9. Testing

- Unit: `matching` (fixture table of real name formats), `rmpProvider` (mocked GraphQL).
- Manual: load unpacked against the live site each milestone.
- Resilience: simulate GWT re-renders to confirm no duplicate badges.

## 10. Top risks & mitigations

| Risk | Mitigation |
|---|---|
| RMP endpoint/fields drift | Isolated in one provider file; graceful `fetch_failed` |
| Wrong-professor match (defamation) | Conservative confidence threshold; neutral marker on doubt |
| GWT re-render breaks injection | `data-rmp-injected` guard + observer re-runs |
| UniTime layout change | Selectors centralized; text/column-based fallback |
| RMP rate-limiting | Aggressive caching + negative cache |
