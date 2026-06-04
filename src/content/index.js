// Content script entry — detects instructors, batches lookups, applies badges.

import { normalizeCourseKey } from '../core/courseKey.js';
import { startDetector, applyBlockVisibility } from './detector.js';
import { injectBadge } from './injector.js';
import { addToComparison, setEntryResult, removeFromComparison } from './comparator.js';
import { initOverlayControl } from './overlay.js';
import { isBlocked, getBlocksMap, professorKey, BLOCKS_STORAGE_KEY } from '../core/blocks.js';
import { getMark, MARKS_STORAGE_KEY } from '../core/userMarks.js';
import { hideProfessorRow, showProfessorRow } from './rowFilter.js';
import {
  queueLookup,
  BUILD_TAG,
  maybeClearLookupCacheFromStorage,
  onProfessorRmpReady,
  hasWarmMergedCache,
} from './lookup.js';

/** @type {Set<import('./injector.js').BadgeHandle>} */
const badgeHandles = new Set();

console.log(`[Purdue RMP] build ${BUILD_TAG} on`, location.href);

/**
 * @param {import('./injector.js').BadgeHandle} badge
 * @param {import('./detector.js').InstructorCandidate} candidate
 * @param {object} entry
 * @param {object} result
 */
async function applyResultToBadge(badge, candidate, entry, result) {
  if (!candidate.element.isConnected) return;

  const base =
    result && typeof result === 'object'
      ? { ...result, displayName: candidate.text, course: candidate.courseContext }
      : result;
  const userMark = await getMark(candidate.text);
  const enriched = base && typeof base === 'object' ? { ...base, userMark } : base;
  await badge.setResult(enriched);
  setEntryResult(entry, enriched);
}

/**
 * When RMP succeeds for a professor, refresh every other badge for that name
 * (fixes duplicate rows that queued before the shared RMP cache was warm).
 * @param {string} pk
 * @param {import('./injector.js').BadgeHandle} sourceBadge
 */
function refreshSiblingBadges(pk, sourceBadge) {
  for (const handle of badgeHandles) {
    if (handle === sourceBadge || !handle.rawName) continue;
    if (professorKey(handle.rawName) !== pk) continue;
    if (!handle.element?.isConnected || !handle.candidate || !handle.entry) continue;

    queueLookup(
      {
        rawName: handle.rawName,
        school: 'purdue',
        course: handle.courseContext || '',
      },
      (result) => applyResultToBadge(handle, handle.candidate, handle.entry, result)
    );
  }
}

function refreshBadgesForProfessor(pk) {
  for (const handle of badgeHandles) {
    if (!handle.rawName || professorKey(handle.rawName) !== pk) continue;
    if (!handle.element?.isConnected || !handle.candidate || !handle.entry) continue;

    const query = {
      rawName: handle.rawName,
      school: 'purdue',
      course: handle.courseContext || '',
    };
    if (hasWarmMergedCache(query)) continue;

    queueLookup(query, (result) =>
      applyResultToBadge(handle, handle.candidate, handle.entry, result)
    );
  }
}

async function boot() {
  initOverlayControl();

  onProfessorRmpReady((pk) => refreshBadgesForProfessor(pk));

  const settings = await chrome.storage.local.get(['enabled', 'debug']);
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
    maybeClearLookupCacheFromStorage(changes);
  });

  async function refreshAllMarks() {
    for (const handle of badgeHandles) {
      if (!handle.rawName) continue;
      handle.refreshMark(await getMark(handle.rawName));
    }
  }

  startDetector(async (candidate) => {
    const courseContext = normalizeCourseKey(candidate.courseContext) || '';

    if (debug) {
      console.log('[Purdue RMP] instructor:', candidate.text, courseContext || '(no course)');
    }

    if (await isBlocked(candidate.text)) {
      hideProfessorRow(candidate.rowElement);
      return;
    }

    const entry = {
      rowElement: candidate.rowElement,
      instructorCell: candidate.element,
      blocked: false,
    };
    addToComparison(courseContext, entry);

    const badge = injectBadge(candidate.element, {
      rawName: candidate.text,
      async onBlockToggle(blocked) {
        entry.blocked = blocked;
        if (blocked) {
          hideProfessorRow(candidate.rowElement);
          badge.remove();
          badgeHandles.delete(badge);
          removeFromComparison(entry);
        } else {
          showProfessorRow(candidate.rowElement);
        }
      },
    });
    if (!badge) return;

    badge.rawName = candidate.text;
    badge.courseContext = courseContext;
    badge.element = candidate.element;
    badge.candidate = candidate;
    badge.entry = entry;
    badgeHandles.add(badge);

    const query = {
      rawName: candidate.text,
      school: 'purdue',
      course: courseContext,
    };

    queueLookup(query, async (result) => {
      if (debug) {
        console.log(
          '[Purdue RMP] result for',
          candidate.text,
          courseContext || '(no course)',
          'overall',
          result?.overall,
          'rmp',
          result?.rmpFetchedIn,
          'rmpStatus',
          result?.rmpStatus,
          result?.rmpErrorDetail || '',
          result
        );
      }

      await applyResultToBadge(badge, candidate, entry, result);

      const pk = professorKey(candidate.text);
      if (pk && (typeof result?.overall === 'number' || result?.rmpStatus === 'ok')) {
        refreshSiblingBadges(pk, badge);
      }
    });
  });
}

boot();
