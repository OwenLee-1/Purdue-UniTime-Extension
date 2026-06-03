# Pre-Submission Launch Checklist

A practical checklist for shipping **Purdue RMP — Inline Professor Ratings** to
the Chrome Web Store. Work top to bottom.

## 1. Clean up the code

- [ ] Remove or disable debug logging (the `[Purdue RMP]` console lines from the
      detection scaffold).
- [ ] Remove discovery-spike / experimentation code used to confirm UniTime
      selectors and the RMP school ID, fields, and endpoint (from M0).
- [ ] Make sure the debug toggle and "report wrong match" affordances are
      intentional and not leaking noisy output in normal use.
- [ ] Confirm there are no leftover hardcoded test names or placeholder data.

## 2. Icons & assets

- [ ] Add all required icon sizes: **16, 32, 48, and 128 px** in `public/icons/`.
- [ ] Confirm `manifest.json` references each icon size (this is owned by another
      process — coordinate, don't edit it yourself).
- [ ] 128px icon is the store icon; make sure it looks good at small sizes too.

## 3. Test on the live site

- [ ] Load the built `dist/` folder unpacked and test against the real
      `timetable.mypurdue.purdue.edu` page.
- [ ] Verify badges inject correctly and survive GWT re-renders (sort, tab
      switches, dialogs) without duplicates.
- [ ] Verify color-coded rating + difficulty render correctly.
- [ ] Verify the hover card shows "would take again" % and the profile link.
- [ ] Verify multi-section "best professor" highlighting.
- [ ] Verify the hide-schedule-preview option works.
- [ ] Verify conservative matching: ambiguous/`Staff`/`TBA` cases show nothing
      (or a neutral marker), never a wrong professor.
- [ ] Verify caching works (second load is fast, no redundant fetches) and that
      negative caching prevents hammering RMP for no-match names.

## 4. Build & package

- [ ] Run a clean production build (`npm run build`).
- [ ] Zip the **contents of `dist/`** (not the parent folder) for upload.
- [ ] Confirm the zipped manifest is Manifest V3 and permissions match what's
      justified in the store listing (`storage`, host permissions for
      `timetable.mypurdue.purdue.edu` and `ratemyprofessors.com`).

## 5. Store assets & listing

- [ ] Create screenshots (1280×800 or 640×400) showing badges on UniTime, the
      hover card, and the best-professor comparison.
- [ ] (Optional) Small promo tile if desired.
- [ ] Finalize listing copy from `STORE_LISTING.md` (name, short description,
      detailed description, category, keywords).
- [ ] Fill in the permission justifications in the dashboard from
      `STORE_LISTING.md`.

## 6. Privacy policy

- [ ] Host `PRIVACY_POLICY.md` at a public URL (e.g. GitHub Pages, a gist, or a
      simple site).
- [ ] Add that URL to the Chrome Web Store listing's privacy policy field.
- [ ] Complete the dashboard's data-use disclosures consistently with the
      policy (no personal data collected; minimal data sent to RMP).

## 7. Risk & legal review

- [ ] **Unofficial RMP API risk:** The extension uses RateMyProfessors'
      undocumented GraphQL endpoint. Confirm graceful failure (`fetch_failed`)
      if fields or the endpoint drift, and be prepared to ship a quick fix.
- [ ] **RMP Terms of Service gray area:** Fetching from RMP's endpoint is not
      explicitly sanctioned. Understand this is a gray area; keep request volume
      low (caching + negative cache help) and be ready to respond if RMP objects.
- [ ] **Defamation / wrong-match risk:** Re-confirm the conservative
      name-matching threshold. Showing the wrong professor's ratings could
      misrepresent a real person. When in doubt, show nothing.
- [ ] Include the disclaimer (`DISCLAIMER.md`) language in the listing and/or UI:
      not affiliated with RMP, Purdue, or UniTime; ratings are user-generated and
      may be inaccurate.
- [ ] Confirm `LICENSE` is present and the author placeholder is filled in.

## 8. Timing the launch

- [ ] Time the public launch (and any r/Purdue post) to **Purdue registration
      season**, when students are actively browsing UniTime and the extension is
      most useful. Allow buffer for Chrome Web Store review time.

## 9. Final submission

- [ ] Upload the zip, fill all listing fields, attach screenshots, set privacy
      policy URL.
- [ ] Submit for review and note the submission date.
