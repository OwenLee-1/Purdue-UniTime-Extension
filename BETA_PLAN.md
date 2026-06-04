# Beta Plan — BoilerClassPlan

This is the roadmap for the "fuller version" of the extension, beyond the shipped
alpha (inline RMP rating + course GPA + best-section highlight + calendar export).

The guiding principle: **maximize what the extension can do entirely on the user's
own machine before taking on a backend.** Local features ship fast, carry no hosting
cost, and have minimal privacy/legal surface. A backend is a deliberate, separate
phase (see [`BACKEND_DESIGN.md`](./BACKEND_DESIGN.md)).

## The two buckets

Every feature falls into one of two buckets, and they have wildly different cost:

- **Bucket 1 — Client-only.** Reads data and computes locally (extension + bundled
  data + public APIs the user's browser can reach). No server, no accounts.
- **Bucket 2 — Backend.** Involves *other users'* data: shared comments, a browsable
  class database, syncing a saved college-career plan across devices. Requires a
  database, accounts, hosting, and (for user content) moderation + legal review.

## Feature inventory

| Feature | Bucket | Effort | Status |
|---|---|---|---|
| Inline RMP rating + course GPA badge | 1 | — | ✅ Shipped (alpha) |
| Best-section highlight | 1 | — | ✅ Shipped (alpha) |
| Calendar export (UniTime iCal → Google/Apple) | 1 | — | ✅ Shipped (alpha) |
| Hide UniTime hover schedule preview | 1 | — | ✅ Shipped (alpha) |
| **Richer hover card: grade distribution + RMP comments** | 1 | 🟡 | ✅ Done (beta) |
| Personal layer: like/dislike + "had this prof before" (manual) | 1 | 🟢 | Planned |
| "Had this prof before" auto-import from Purdue history page | 1 | 🟡 | Planned |
| Factor GPA into best-section + "realistic" composite rating | 1 | 🟡 | Planned |
| Schedule planner: lock classes / combinations / plan ahead | 1 | 🟠 | Planned |
| Majors/tests/prereqs lookup | 1 | 🟡 | Needs data-source research (`api.purdue.io`) |
| Let other users add comments | 2 | 🔴 | Deferred → backend phase |
| Browsable shared class database | 2 | 🔴 | Deferred → backend phase |
| Map entire college career (saved/synced) | 2 | 🔴 | Deferred → backend phase ("end product") |
| Reddit sentiment | 2 | 🔴 | Shelved (ToS + noisy attribution) |
| YikYak sentiment | — | ⛔ | Dropped (no public API, unattributable) |

Effort key: 🟢 small · 🟡 medium · 🟠 large · 🔴 backend-scale

## Phased plan

### Phase B1 — Richer information (in progress)
Make each badge/hover-card maximally informative using data we already reach.
- [x] Full A/B/C/D/F grade distribution in the hover card (from bundled BoilerGrades data).
- [x] Recent RateMyProfessors student comments in the hover card.
- [x] Recent review sentiment (avg stars on fetched reviews) in hover card + composite.
- [x] Factor GPA into the best-section highlight (composite score, not just RMP rating).
- [x] "Realistic" composite score (blend of RMP + would-take-again + GPA; tweak weights in `src/core/compositeScore.js`).

### Phase B2 — Personal layer
Make it feel like *yours*. All local.
- [x] Hide / block a professor — section filtered out of UniTime (popup list to unhide).
- [x] Mark a professor 👍/👎 (persists in `chrome.storage.local`).
- [x] Mark "I've taken this professor" + a note.
- [x] Surface those marks on the badge/hover card on future visits.
- [ ] One-click import from a Purdue enrollment-history page (local scan, opt-in).

### Phase B3 — Planning
- [ ] Lock chosen sections; explore combinations without losing them.
- [ ] Lightweight "plan ahead" notes for future semesters.
- [ ] (Stretch) prereq/requirement hints — pending `api.purdue.io` research.

### Phase B4 — Backend platform (separate track)
Only after beta feedback validates demand. See [`BACKEND_DESIGN.md`](./BACKEND_DESIGN.md).
- [ ] User accounts + sync.
- [ ] Crowd comments with moderation.
- [ ] Browsable class/professor database site.
- [ ] Saved college-career mapping.

## "Realistic" composite rating — design note

The intent is a single number that blends signals. Keep it **transparent and
conservative**:
- Inputs we have locally today: RMP overall rating (0–5), RMP would-take-again %,
  course GPA (0–4), grade distribution.
- Normalize each to a 0–1 scale, weight them, and always show the underlying numbers
  so users can see *why*. Never present a black-box score as fact.
- Label it clearly as an estimate (e.g. "Composite ⓘ") and let users see the breakdown.

## Data-sourcing realities

- **Grades**: BoilerGrades open dataset (static, FOIA-sourced, ~yearly refresh).
  Bundled offline. Refresh via `npm run build:grades`.
- **RMP**: unofficial public GraphQL endpoint (rating, tags, would-take-again, comments).
- **Prereqs/requirements**: likely `api.purdue.io` (Purdue OData). Unverified — research
  before promising in UI.
- **Reddit/YikYak**: deprioritized; attribution to a specific professor is unreliable and
  ToS/access constraints are significant.
