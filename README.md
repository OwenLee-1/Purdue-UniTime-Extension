## BoilerClassPlan — Inline Course Prep

Rev A: A Chrome extension that give professor data alongside each professor shown in the UniTime portal for ease of life. Displays RateMyProfessor ratings and Average Course GPA, pulling from RateMyProfessor and BoilerCourses respectively. 



> Status: **alpha**. Core features below are working. See `[BUILD_PLAN.md](./BUILD_PLAN.md)` for the roadmap.

## Overview

- **Inline rating**  next to each instructor: `★ 4.3 · 3.2 GPA` (RateMyProfessor overall rating + professor's average GPA for the course).
- **Hover card** with more details: difficulty, would-take-again %, top tags, number of ratings, and a link to the RateMyProfessors profile.
  - To be expanded in furture revisions, include feedback (ex. Comments)
- **Best-section highlight**: when a course has multiple sections, the highest-rated professor is flagged so you can pick at a glance.
- **Average GPA** comes from the open [BoilerGrades](https://www.boilergrades.com/)
dataset (Purdue public-records grade distributions), bundled with the extension so
it works offline.
- **Hide UniTime's hover schedule preview** (optional toggle): Ability to hide schedule preview so that professor details are more accessable when hovering over classes.
- **Calendar export helper**: paste your UniTime iCalendar URL into the popup and get
one-click "Add to Google / Apple / Outlook" links.

## Installation - Alpha Testing

1. Download the alpha build zip file inside "alpha" folder and **unzip** it.
2. Go to `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the unzipped folder.
5. Open the extension's popup and click **Clear cached ratings** once.
6. **Reload** your UniTime class-list tab — ratings appear next to instructor names.

> Note: Chrome can't install a raw `.zip` directly; it must be unzipped first. A true
> one-click install will come once the extension is published to the Chrome Web Store.

### Reporting feedback (alpha)

The easiest way to report a problem or suggest something is to
**[open an issue](https://github.com/OwenLee-1/Purdue-UniTime-Extension/issues/new/choose)**
— pick "Bug report / wrong match" or "Feature idea" and fill in the form. (Prefer not
to use GitHub? The popup's "Report a wrong match" link opens a pre-filled email instead.)

If something looks off, it helps a lot to include:

- The **course + section** and the **instructor name** exactly as UniTime shows it.
- What you saw (e.g. "GPA only, no star" or a wrong professor) vs. what you expected.
- Bonus: turn on **Debug mode** in the popup, open Chrome's DevTools console, and copy
any `[Purdue RMP]` lines for that professor — they show the match status.

## Program Framework


| Piece                               | Folder                          | Job                                                                            |
| ----------------------------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| **On-page helper** (content script) | `src/content/`                  | Reads the UniTime page and draws badges. The "eyes + hands."                   |
| **Back office** (background worker) | `src/background/` + `src/core/` | Fetches ratings from RateMyProfessors and remembers them. The "phone + brain." |
| **Permission slip**                 | `manifest.json`                 | Tells Chrome what the extension may do and where it runs.                      |


The on-page helper isn't allowed to call other websites directly (Chrome security),
so it sends a message to the back office, which does the lookup and replies.

## Folder guide

```
manifest.json              # the permission slip
vite.config.js             # build-tool config (packages everything for Chrome)
scripts/
  build-grades.mjs         # data-prep: BoilerGrades CSVs -> bundled GPA dataset
src/
  content/                 # the on-page helper
    index.js               # starts the helper
    detector.js            # finds professor names + course context
    injector.js            # places a badge into the page
    comparator.js          # highlights the best-rated section of a course
    overlay.js             # optional hiding of UniTime's hover schedule preview
    ui/Badge.js            # the little rating/GPA pill
    ui/Popover.js          # the hover card with more details
  background/
    service-worker.js      # the back office: handles lookups + cache + throttling
  core/                    # the back office's brain (reusable logic)
    matching.js            # turns "Doe, Jane M." into a confident match
    cache.js               # remembers ratings so we don't re-ask RMP
    providers/
      Provider.js          # the standard shape every data source returns
      rmpProvider.js       # the RateMyProfessors data source
      gradesProvider.js    # the average-GPA data source (course + instructor)
      gradesData.js        # AUTO-GENERATED bundled GPA dataset (do not edit)
      registry.js          # the list of active data sources
  popup/                   # the toolbar popup (toggles, cache, calendar export)
  options/                 # the settings page
```

## Running Locally (Ignore if Alpha Testing)

You need [Node.js](https://nodejs.org/) installed (which gives you `npm`).

1. Install the project's tools:
  ```bash
   npm install
  ```
2. Build the extension into a `dist/` folder:
  ```bash
   npm run build
  ```
   (Or run `npm run dev` to rebuild automatically as you edit.)
3. Load it into Chrome:
  - Go to `chrome://extensions`
  - Turn on **Developer mode** (top-right)
  - Click **Load unpacked** and select the `dist/` folder
4. Open Purdue's UniTime scheduling page. Ratings appear next to instructor names.
  Toggle **Debug mode** in the popup to see `[Purdue RMP]` log lines (including each
   lookup's match status) in Chrome's DevTools console.

## Updating the GPA data

The average-GPA dataset is generated from the open BoilerGrades CSVs and bundled into
the build. To refresh it (e.g. after a new public-records release):

```bash
npm run build:grades   # regenerates src/core/providers/gradesData.js
npm run build          # repackages the extension
```

## Roadmap

See `[BUILD_PLAN.md](./BUILD_PLAN.md)` for the full plan and milestones (M0–M7).
