# Backend Design (Phase B4)

This document designs the backend needed for the "fuller" features that **cannot**
live purely in the extension: shared user comments, a browsable class/professor
database, and a synced "map my whole college career" experience.

> Status: **design only.** Nothing here is built yet. The extension stays fully
> functional and offline-capable without any of this. Build this only once beta
> feedback shows real demand.

## Why these features need a backend

The alpha/beta extension is client-only: it reads public data and stores personal
data locally. The moment a feature involves **one user seeing another user's data**,
you need a shared, authoritative store — i.e. a server with a database. That brings
four new responsibilities the extension never had: accounts/auth, data storage,
abuse moderation, and uptime/cost.

## What's in scope

1. **User accounts + sync** — sign in; personal data (like/dislike, "had before",
   saved plans) follows you across devices instead of living only in one browser.
2. **Crowd comments** — users post comments on professors/courses; others read them.
3. **Browsable database site** — a website to explore aggregated grade/rating/comment
   data without the extension.
4. **College-career map** — a saved, multi-semester plan tied to the account.

## Recommended architecture (lean, low-cost to start)

Optimize for "cheap and simple until it has users," not for scale you don't have yet.

```
┌─────────────┐      ┌──────────────────┐      ┌────────────────┐
│  Extension  │◀────▶│   API (backend)  │◀────▶│   Postgres DB  │
│  (content + │ HTTPS│  REST/JSON       │      │  users,        │
│   popup)    │  JWT │  auth + comments │      │  comments,     │
└─────────────┘      │  + plans + data  │      │  plans, votes  │
        ▲            └──────────────────┘      └────────────────┘
        │                     ▲
┌─────────────┐               │
│  Website    │───────────────┘
│ (browse DB) │
└─────────────┘
```

- **Backend**: a single small service. Node (Express/Fastify) keeps it in the same
  language as the extension; Python (FastAPI) is fine too. Start as one deployable.
- **Database**: PostgreSQL (managed: Supabase / Neon / Railway free tier to start).
- **Auth**: prefer a managed provider (Supabase Auth, Clerk, or "Sign in with Google").
  Avoid hand-rolling password storage. **Strongly prefer Purdue Google SSO** so only
  real students participate — this is also your best spam/abuse defense.
- **Website**: static frontend (the same Vite stack) that calls the API. Can be the
  same repo.
- **Hosting**: Railway/Render/Fly for the API; Vercel/Netlify for the site. All have
  usable free/cheap tiers for an alpha-sized audience.

## Data model (first cut)

```
users        (id, school_email, display_name, created_at)
professors   (id, rmp_legacy_id, first, last, department)   -- mirror/caches RMP identity
courses      (id, code "MA 26100", title)
comments     (id, user_id, professor_id, course_id, body, created_at,
              status: visible|flagged|removed)
comment_votes(user_id, comment_id, value: +1|-1)
user_marks   (user_id, professor_id, sentiment: like|dislike, taken: bool, note)
plans        (id, user_id, name)
plan_items   (plan_id, course_id, section, term, locked: bool)
```

Personal marks can live **both** locally (instant, offline) and sync to `user_marks`
when signed in — local-first with background sync is the best UX.

## Comments: the hard part (moderation + legal)

User-generated content is the single biggest source of risk. Plan for it before
launch, not after:

- **Identity gate**: require Purdue SSO to post. Pseudonymous display is fine, but a
  real account behind each comment massively reduces abuse and defamation risk.
- **Moderation**:
  - Automated first pass (profanity/PII/spam filters; consider an LLM classifier).
  - User **report** button → `flagged` status → human review queue.
  - Clear, short **content policy** (no harassment, no claims of cheating/criminal
    conduct about a named person, no PII).
- **Takedown path**: a documented way for a professor/person to request removal.
- **Liability framing**: comments are user opinions, clearly attributed as such; the
  platform hosts but does not endorse. Get a second opinion from someone
  legally-minded before enabling public posting at scale.
- **Rate limits**: per-user posting caps to blunt spam.

## Privacy & compliance

- Publish a privacy policy covering what's stored server-side and why (the current
  extension's policy assumes **local-only** data — this must be updated before any
  server storage of user data).
- Store the minimum needed. Don't store transcripts or grades tied to a person.
- Let users delete their account and their data.
- Keep using public/aggregate data sources (BoilerGrades, RMP) — don't ingest
  anything FERPA-protected.

## Rollout sequence (when Phase B4 starts)

1. **Accounts + sync only.** No public content. Just let signed-in users sync their
   own private marks/plans. Lowest risk, immediately useful, proves the auth stack.
2. **Read-only browse site.** Surface the aggregate grade/rating data publicly. No
   user content yet.
3. **Comments (gated + moderated).** Turn on posting last, with SSO + reporting +
   policy in place from day one.
4. **College-career map.** Build on the synced plans once accounts are solid.

## Open questions to resolve before building

- Is Purdue Google SSO feasible/allowed for this use? (Best abuse defense if so.)
- Hosting budget and expected concurrent users for the beta cohort?
- Who owns moderation day-to-day?
- Does `api.purdue.io` provide course/prereq data we can legally cache server-side?
