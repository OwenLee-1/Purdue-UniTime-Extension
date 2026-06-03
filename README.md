# Purdue RMP — Inline Professor Ratings

A Chrome extension that shows **RateMyProfessors** ratings right next to professor
names on Purdue's **UniTime** scheduling site (`timetable.mypurdue.purdue.edu`), so
you can compare professors without leaving the page.

> Status: early scaffold (milestone **M1**). It currently detects instructor names
> on the page and logs them to the console. Real ratings come in later milestones.

## How the extension is organized

Think of it as three pieces:

| Piece | Folder | Job |
|---|---|---|
| **On-page helper** (content script) | `src/content/` | Reads the UniTime page and draws badges. The "eyes + hands." |
| **Back office** (background worker) | `src/background/` + `src/core/` | Fetches ratings from RateMyProfessors and remembers them. The "phone + brain." |
| **Permission slip** | `manifest.json` | Tells Chrome what the extension may do and where it runs. |

The on-page helper isn't allowed to call other websites directly (Chrome security),
so it sends a message to the back office, which does the lookup and replies.

## Folder guide

```
manifest.json              # the permission slip
vite.config.js             # build-tool config (packages everything for Chrome)
src/
  content/                 # the on-page helper
    index.js               # starts the helper
    detector.js            # finds professor names (watches the page for changes)
    injector.js            # places a badge into the page
    ui/Badge.js            # the little rating pill
    ui/Popover.js          # the hover card with more details
  background/
    service-worker.js      # the back office: handles lookups + cache
  core/                    # the back office's brain (reusable logic)
    matching.js            # turns "Doe, Jane M." into a confident match
    cache.js               # remembers ratings so we don't re-ask RMP
    providers/
      Provider.js          # the standard shape every data source returns
      rmpProvider.js       # the RateMyProfessors data source (v1's only one)
      registry.js          # the list of active data sources
  popup/                   # the toolbar popup (on/off, debug)
  options/                 # the settings page
```

## Running it locally

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
4. Open Purdue's UniTime scheduling page. Open Chrome's DevTools console
   (`View → Developer → JavaScript Console`) and you should see
   `[Purdue RMP]` log lines showing detected instructor names.

## Roadmap

See [`BUILD_PLAN.md`](./BUILD_PLAN.md) for the full plan and milestones (M0–M7).
