# Chrome Web Store Listing

Copy-and-paste content for the Chrome Web Store developer dashboard.

---

## Name

**Purdue RMP — Inline Professor Ratings**

(Short form, if a tighter name is needed: **Purdue RMP Ratings**)

---

## Short description (132 characters max)

> See RateMyProfessors ratings right next to instructor names on Purdue's UniTime scheduling page — no extra tabs.

(110 characters — within the 132-character limit.)

---

## Detailed description

**Pick better professors without leaving Purdue's scheduling page.**

Purdue RMP adds RateMyProfessors ratings directly onto Purdue's UniTime
scheduling site (timetable.mypurdue.purdue.edu). When you're browsing course
sections, you instantly see how each instructor is rated — no copying names
into a separate tab, no guessing.

**What it does**

- **Inline RMP ratings on UniTime** — A small rating badge appears next to each
  professor name, right where it already shows up in the schedule.
- **Color-coded rating + difficulty** — Ratings and difficulty are color-coded
  so you can scan a long list of sections at a glance.
- **Hover card with the details** — Hover a badge to see the "would take again"
  percentage and a direct link to the professor's full RateMyProfessors profile.
- **Best-professor comparison across sections** — When a course is taught by
  multiple instructors, the extension highlights the best-rated option so the
  choice is obvious.
- **Cleaner planning view** — Optionally hide UniTime's schedule preview to keep
  the page focused while you compare professors.
- **Fast and local caching** — Ratings are cached locally in your browser, so
  pages load quickly and the extension isn't constantly re-fetching data.

**Built to be careful, not loud**

The extension uses conservative name matching. If it can't confidently match an
instructor to a RateMyProfessors profile, it shows nothing rather than risk
attaching the wrong professor's ratings to someone.

**Privacy first**

No personal data, no student records, and no analytics or tracking. The
extension only sends a professor's name and school to RateMyProfessors to look
up public ratings. Everything else (ratings cache and your settings) stays in
your browser. See the privacy policy for full details.

Made for Purdue students, by people who got tired of opening ten tabs every
registration season.

> Not affiliated with or endorsed by RateMyProfessors, Purdue University, or
> UniTime. Ratings are user-generated and may be inaccurate.

---

## Permissions justification

Use these explanations in the dashboard's "Privacy practices" / permission
justification fields.

### `storage`
Used to cache RateMyProfessors rating data and to save your extension settings
(such as toggles) locally in your browser via `chrome.storage.local`. Caching
avoids re-fetching the same ratings repeatedly, which keeps the page fast and
reduces load on RateMyProfessors. No personal or student data is stored.

### Host permission: `timetable.mypurdue.purdue.edu`
Required so the content script can run on Purdue's UniTime scheduling page —
the only place the extension does anything. It reads instructor names already
shown on the page and draws rating badges next to them.

### Host permission: `ratemyprofessors.com`
Required so the background service worker can fetch public professor ratings
from RateMyProfessors. The fetch runs from the background worker (not the page)
to avoid cross-origin issues. Only a professor's name and school are sent;
nothing about you is transmitted.

**No personal or student data is collected or transmitted.** The extension does
not read your login, courses you've registered for, grades, or any account
information. It only reads instructor names that are already visible on the
public scheduling page.

---

## Category

**Education** (alternative: Productivity)

---

## Search keywords / tags

Purdue, RateMyProfessors, RMP, professor ratings, UniTime, course registration,
Boilermaker, schedule, professors, class scheduling, myPurdue, college
