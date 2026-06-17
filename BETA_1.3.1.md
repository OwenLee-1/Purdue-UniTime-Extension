# Beta 1.3.1 — Course-scoped RMP reviews

**Tag:** `v1.3.1-beta`  
**Date:** June 2026  
**Status:** Public beta — filters RMP reviews by the UniTime course you're viewing.

Prior release: [`BETA_1.3.0.md`](./BETA_1.3.0.md) · tag `v1.3.0-beta`.

## What's new

### RMP for this course
- Matches RMP review **class** tags (e.g. `MA261`) to the UniTime course (e.g. `MA 26100`).
- **Side panel:** course RMP card when **3+** tagged reviews exist, plus course-specific comments and sentiment.
- **Hover preview:** shows course RMP line and prefers course-tagged comments when available.
- **Badge unchanged:** still shows overall instructor RMP + course GPA at a glance.

### Fallbacks
- Fewer than 3 course-tagged reviews → no course average; may show a note or fall back to all recent reviews.
- Only the latest **12** RMP ratings are fetched — older course reviews may not appear.

## Install / upgrade

Same as [1.3.0](./BETA_1.3.0.md#install). After upgrading: reload extension → **Clear cached ratings** → reload UniTime.

Console: `[Purdue RMP] build 1.3.1-beta`.

## Verify

1. Open a course with a well-reviewed professor (e.g. large intro class).
2. Hover badge → look for **★ X.X / 5 for MA 26100 (n=…)** under the overall RMP line.
3. Click badge → **RMP for MA 26100** card and **Comments for MA 26100** section when matches exist.
