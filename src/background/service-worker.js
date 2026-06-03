// The "back office" of the extension (the background service worker).
//
// The content script that runs on the UniTime page is NOT allowed to call other
// websites directly (Chrome's security model). So when it needs a professor's
// rating, it sends a message here, and THIS file does the network/cache work and
// sends the answer back.
//
// The conversation looks like:
//   content script  --->  { type: "LOOKUP_PROFESSOR", query }  --->  here
//   here            --->  ProviderResult                       --->  content script

import { getProvider } from '../core/providers/registry.js';
import { normalizeName } from '../core/matching.js';
import { getCached, setCached } from '../core/cache.js';

/**
 * Cache key for the RMP rating. It is intentionally course-INDEPENDENT: a
 * professor's RMP rating is the same in every course, so we can reuse it. (GPA is
 * course-specific but comes from local bundled data, so it isn't cached here.)
 * @param {import('../core/providers/Provider.js').ProfessorQuery} query
 */
function rmpCacheKey(query) {
  const n = normalizeName(query.rawName);
  return `${query.school}:${n.last}:${n.first}`;
}

// --- Lightweight concurrency limiter for RMP requests ---
// Scanning a class list can fire dozens of lookups at once; hitting RMP with all
// of them in parallel risks rate-limiting (which previously got cached as a
// permanent "GPA only" result). We cap how many RMP fetches run at a time.
const MAX_CONCURRENT_RMP = 3;
let activeRmp = 0;
const rmpQueue = [];

function runWhenFree(task) {
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

/**
 * Get the RMP rating for a professor, using the cache when possible. Transient
 * fetch failures are NOT cached, so they retry on the next page load.
 * @param {import('../core/providers/Provider.js').ProfessorQuery} query
 */
async function getRmpResult(query) {
  const provider = getProvider('rmp');
  if (!provider) return null;

  const key = rmpCacheKey(query);
  const cached = await getCached(key);
  if (cached) return cached;

  const result = await runWhenFree(() => provider.lookup(query));

  // Only cache stable answers. A failed network call is temporary — don't let it
  // stick around and mask a professor who actually has ratings.
  if (result && result.status !== 'fetch_failed') {
    await setCached(key, result);
  }
  return result;
}

/**
 * Handle a single lookup: get the RMP rating (cached) and the course GPA (local),
 * then merge them into one result the badge can render.
 * @param {import('../core/providers/Provider.js').ProfessorQuery & {course?: string}} query
 * @returns {Promise<import('../core/providers/Provider.js').ProviderResult>}
 */
async function handleLookup(query) {
  const gradesProvider = getProvider('grades');

  const [rmpRes, gradesRes] = await Promise.all([
    getRmpResult(query),
    gradesProvider ? gradesProvider.lookup(query) : Promise.resolve(null),
  ]);

  // Start from the RMP result so its status (ok / no_match / ambiguous /
  // fetch_failed) is preserved — that drives the badge's "no confident match"
  // marker. Then layer GPA on top whenever we have it.
  const merged = {
    source: 'rmp',
    confidence: rmpRes?.confidence ?? 0,
    status: rmpRes?.status || 'no_match',
  };

  if (rmpRes?.status === 'ok') {
    merged.overall = rmpRes.overall;
    merged.difficulty = rmpRes.difficulty;
    merged.sampleSize = rmpRes.sampleSize;
    merged.detail = rmpRes.detail;
  }

  if (gradesRes?.status === 'ok') {
    merged.gpa = gradesRes.gpa;
    merged.gpaSampleSize = gradesRes.gpaSampleSize;
    // If RMP had no usable rating but we DO have grade data, promote the status to
    // "ok" so the badge still renders a (GPA-only) pill instead of a quiet "?".
    if (merged.status !== 'ok') merged.status = 'ok';
  }

  return merged;
}

// Listen for messages from the content script.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'LOOKUP_PROFESSOR') {
    handleLookup(message.query)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));

    // Return true to tell Chrome we'll respond asynchronously (after the await).
    return true;
  }
  return undefined;
});

console.log('[Purdue RMP] background service worker ready');
