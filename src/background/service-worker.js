// Background worker — network RMP + bundled GPA (grades data is large).

import { professorKey } from '../core/blocks.js';
import { getCached, setCached } from '../core/cache.js';
import { lookupKey } from '../core/lookupKey.js';
import { GradesProvider } from '../core/providers/gradesProvider.js';
import { RmpProvider } from '../core/providers/rmpProvider.js';
import { ensureRmpRequestHeaders } from './rmpNetRules.js';
import { lookupRmpViaOffscreen, summarizeReviewsViaOffscreen } from './offscreenFetch.js';

export const BUILD_TAG = '1.3.0-beta';

const gradesProvider = new GradesProvider();
const rmpProvider = new RmpProvider();

const MAX_CONCURRENT_RMP = 4;
let activeRmp = 0;
/** @type {Array<() => void>} */
const rmpQueue = [];

function runWhenRmpSlot(task) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (activeRmp >= MAX_CONCURRENT_RMP) {
        rmpQueue.push(attempt);
        return;
      }
      activeRmp++;
      task()
        .then(resolve, reject)
        .finally(() => {
          activeRmp--;
          const next = rmpQueue.shift();
          if (next) next();
        });
    };
    attempt();
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureRmpRequestHeaders().catch((err) =>
    console.warn('[Purdue RMP] RMP header rules failed:', err)
  );
});
ensureRmpRequestHeaders().catch((err) =>
  console.warn('[Purdue RMP] RMP header rules failed:', err)
);

/**
 * @param {object} query
 */
async function lookupRmp(query) {
  const pk = professorKey(query.rawName);
  if (!pk) return { source: 'rmp', status: 'no_match', confidence: 0 };

  const stored = await getCached(pk);
  if (stored?.status === 'ok' && typeof stored.overall === 'number') {
    const missingReviews =
      (stored.sampleSize || 0) > 0 &&
      (!(stored.detail?.reviews?.length) || !(stored.detail?.recentRatings?.length));
    if (!missingReviews) {
      return { ...stored, rmpFetchedIn: 'background-cache' };
    }
  }

  let result;
  try {
    result = await runWhenRmpSlot(() => rmpProvider.lookup(query));
    if (result?.status === 'fetch_failed') {
      await new Promise((r) => setTimeout(r, 600));
      result = await runWhenRmpSlot(() => rmpProvider.lookup(query));
    }
    if (result?.status === 'fetch_failed') {
      const offscreen = await lookupRmpViaOffscreen(query);
      if (offscreen) result = offscreen;
    }
  } catch (err) {
    console.warn('[Purdue RMP] background RMP error:', err);
    return {
      source: 'rmp',
      status: 'fetch_failed',
      confidence: 0,
      rmpFetchedIn: 'background',
      errorDetail: String(err),
    };
  }

  if (result?.status === 'ok' && typeof result.overall === 'number') {
    await setCached(pk, result);
  }

  return { ...result, rmpFetchedIn: 'background' };
}

/**
 * @param {Array<{ rawName: string, school?: string, course?: string }>} queries
 */
async function handleGradesBatch(queries) {
  const results = {};
  const seen = new Set();

  for (const query of queries) {
    const key = lookupKey(query);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    try {
      results[key] = await gradesProvider.lookup(query);
    } catch (err) {
      console.warn('[Purdue RMP] grades lookup error:', key, err);
      results[key] = { source: 'grades', status: 'no_match', confidence: 0 };
    }
  }
  return results;
}

/**
 * @param {Array<{ rawName: string, school?: string, course?: string }>} queries
 */
async function handleRmpBatch(queries) {
  const results = {};
  const seen = new Set();
  /** @type {Array<{ pk: string, query: object }>} */
  const pending = [];

  for (const query of queries) {
    const pk = professorKey(query.rawName);
    if (!pk || seen.has(pk)) continue;
    seen.add(pk);
    pending.push({ pk, query });
  }

  await Promise.all(
    pending.map(async ({ pk, query }) => {
      results[pk] = await lookupRmp(query);
    })
  );
  return results;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Handled by the offscreen document.
  if (message?.type === 'RMP_OFFSCREEN_LOOKUP' || message?.type === 'SUMMARIZE_REVIEWS_OFFSCREEN') {
    return undefined;
  }

  if (message?.type === 'PING') {
    sendResponse({ ok: true, build: BUILD_TAG });
    return true;
  }

  if (message?.type === 'LOOKUP_GRADES_BATCH') {
    handleGradesBatch(message.queries || [])
      .then((results) => sendResponse({ ok: true, results }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message?.type === 'LOOKUP_GRADES') {
    gradesProvider
      .lookup(message.query)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message?.type === 'LOOKUP_RMP') {
    lookupRmp(message.query || {})
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message?.type === 'LOOKUP_RMP_BATCH') {
    handleRmpBatch(message.queries || [])
      .then((results) => sendResponse({ ok: true, results }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message?.type === 'RMP_PROBE') {
    runWhenRmpSlot(() => rmpProvider.lookup({ rawName: message.rawName || 'Weng' }))
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message?.type === 'SUMMARIZE_REVIEWS') {
    summarizeReviewsViaOffscreen(message.texts || [])
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message?.type === 'OPEN_OPTIONS') {
    chrome.runtime
      .openOptionsPage()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  return undefined;
});

console.log(`[Purdue RMP] background ${BUILD_TAG} (RMP + GPA)`);
