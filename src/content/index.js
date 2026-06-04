// The "start here" file for the on-page helper (content script).
//
// Runs on Purdue UniTime. Finds instructor cells in the List of Classes table and
// attaches a small rating badge next to each name (placeholder until RMP lookup
// is wired in milestone M3).

import { startDetector, applyBlockVisibility } from './detector.js';
import { injectBadge } from './injector.js';
import { addToComparison, setEntryResult, removeFromComparison } from './comparator.js';
import { initOverlayControl } from './overlay.js';
import { isBlocked, getBlocksMap, professorKey, BLOCKS_STORAGE_KEY } from '../core/blocks.js';
import { getMark, MARKS_STORAGE_KEY } from '../core/userMarks.js';
import { hideProfessorRow, showProfessorRow } from './rowFilter.js';

/** @type {Map<string, import('./injector.js').BadgeHandle>} */
const badgeHandles = new Map();

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

  const blocks = await getBlocksMap();
  applyBlockVisibility(blocks, professorKey);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[BLOCKS_STORAGE_KEY]) {
      getBlocksMap().then((map) => applyBlockVisibility(map, professorKey));
    }
    if (changes[MARKS_STORAGE_KEY]) {
      refreshAllMarks();
    }
  });

  async function refreshAllMarks() {
    for (const [rawName, handle] of badgeHandles) {
      const mark = await getMark(rawName);
      handle.refreshMark(mark);
    }
  }

  startDetector(async (candidate) => {
    if (debug) {
      console.log('[Purdue RMP] instructor:', candidate.text, candidate.courseContext || '');
    }

    if (await isBlocked(candidate.text)) {
      hideProfessorRow(candidate.rowElement);
      return;
    }

    const entry = { rowElement: candidate.rowElement, instructorCell: candidate.element, blocked: false };
    addToComparison(candidate.courseContext, entry);

    const badge = injectBadge(candidate.element, {
      rawName: candidate.text,
      async onBlockToggle(blocked) {
        entry.blocked = blocked;
        if (blocked) {
          hideProfessorRow(candidate.rowElement);
          badge.remove();
          removeFromComparison(entry);
        } else {
          showProfessorRow(candidate.rowElement);
        }
      },
    });
    if (!badge) return;
    badgeHandles.set(candidate.text, badge);

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
        (async () => {
          const base =
            result && typeof result === 'object'
              ? { ...result, displayName: candidate.text, course: candidate.courseContext }
              : result;
          const userMark = await getMark(candidate.text);
          const enriched = base && typeof base === 'object' ? { ...base, userMark } : base;
          await badge.setResult(enriched);
          setEntryResult(entry, enriched);
        })();
      }
    );
  });
}

boot();
