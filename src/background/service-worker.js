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
 * Build a stable cache key for a professor query so the same person maps to the
 * same key regardless of small formatting differences.
 * @param {import('../core/providers/Provider.js').ProfessorQuery} query
 */
function cacheKeyFor(query) {
  const n = normalizeName(query.rawName);
  return `${query.school}:${n.last}:${n.first}`;
}

/**
 * Handle a single professor lookup: check cache first, then ask the provider.
 * @param {import('../core/providers/Provider.js').ProfessorQuery} query
 * @returns {Promise<import('../core/providers/Provider.js').ProviderResult>}
 */
async function handleLookup(query) {
  const key = cacheKeyFor(query);

  const cached = await getCached(key);
  if (cached) return cached;

  const provider = getProvider('rmp');
  if (!provider) {
    return { source: 'rmp', confidence: 0, status: 'fetch_failed' };
  }

  const result = await provider.lookup(query);
  await setCached(key, result);
  return result;
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
