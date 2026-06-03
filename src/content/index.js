// The "start here" file for the on-page helper (content script).
//
// Runs on Purdue UniTime. Finds instructor cells in the List of Classes table and
// attaches a small rating badge next to each name (placeholder until RMP lookup
// is wired in milestone M3).

import { startDetector } from './detector.js';
import { injectBadge } from './injector.js';
import { addToComparison, setEntryResult } from './comparator.js';
import { initOverlayControl } from './overlay.js';

console.log('[Purdue RMP] content script loaded on', location.href);

async function getSettings() {
  return chrome.storage.local.get(['enabled', 'debug']);
}

async function boot() {
  // Overlay control is independent of the ratings feature, so set it up first
  // (and regardless of whether ratings are enabled).
  initOverlayControl();

  const settings = await getSettings();

  if (settings.enabled === false) {
    console.log('[Purdue RMP] disabled via popup toggle');
    return;
  }

  const debug = settings.debug === true;

  startDetector((candidate) => {
    if (debug) {
      console.log('[Purdue RMP] instructor:', candidate.text, candidate.courseContext || '');
    }

    const badge = injectBadge(candidate.element);
    if (!badge) return;

    // Register this section for multi-section comparison (M5).
    const entry = { rowElement: candidate.rowElement, instructorCell: candidate.element };
    addToComparison(candidate.courseContext, entry);

    // Ask the background worker (which can reach RateMyProfessors) for a rating.
    chrome.runtime.sendMessage(
      {
        type: 'LOOKUP_PROFESSOR',
        query: { rawName: candidate.text, school: 'purdue', course: candidate.courseContext },
      },
      (response) => {
        const result = chrome.runtime.lastError || !response?.ok ? { status: 'fetch_failed' } : response.result;
        if (debug) console.log('[Purdue RMP] result for', candidate.text, result);
        // Carry the UniTime name + course so the hover card always has context,
        // even when there's no RMP match (GPA-only).
        const enriched =
          result && typeof result === 'object'
            ? { ...result, displayName: candidate.text, course: candidate.courseContext }
            : result;
        badge.setResult(enriched);
        setEntryResult(entry, enriched);
      }
    );
  });
}

boot();
