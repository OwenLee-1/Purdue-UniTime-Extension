# Beta 1.1.0 — Hover card polish

**Tag:** `v1.1.0-beta`  
**Date:** June 2026  
**Status:** Public beta — cleaner hover UI and more reliable recent-review sentiment.

Rollback reference for this release: [`BETA_1.0.0.md`](./BETA_1.0.0.md) · tag `v1.0.0-beta`.

## What's new in 1.1.0

- **Removed** composite breakdown weight/signal rows from the hover card (less noise).
- **Richer review sentiment:** fetches 12 recent RMP ratings; sentiment uses all star scores (n up to 12, minimum n=3 to display).
- **More comments:** up to 5 recent written reviews in the hover card (was 3).
- **Cache v6:** auto-refreshes stale RMP entries missing the new `recentRatings` batch.
- **GitHub Actions** release workflow: tagged `v*` builds attach a Chrome-ready zip to Releases.

## Install for testers (no terminal)

1. Open **[GitHub Releases](https://github.com/OwenLee-1/Purdue-UniTime-Extension/releases)**.
2. Download **`purdue-rmp-extension-v1.1.0-beta.zip`** from the **v1.1.0-beta** release.
3. **Unzip** the file (Chrome cannot load a `.zip` directly).
4. Go to `chrome://extensions` → **Developer mode** → **Load unpacked** → select the **unzipped folder**.
5. Extension popup → **Clear cached ratings** → reload the UniTime tab.
6. Confirm the console shows: `[Purdue RMP] build 1.1.0-beta`.

## Install for developers (local build)

```bash
npm install
npm run build
```

Load the **`dist/`** folder at `chrome://extensions` (not the repo root).

## Verify

1. Hover a professor with several RMP reviews (e.g. `S Weng`).
2. Hover card should show **Recent comments** (up to 5) and **Recent review sentiment** with **n ≥ 3**.
3. Composite breakdown weight/signal rows should **not** appear.

## Known limitations

Same as [1.0.0](./BETA_1.0.0.md#known-limitations). Professors with fewer than 3 recent star ratings on RMP will not show the sentiment line.
