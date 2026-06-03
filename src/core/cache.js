// The "memory" of the extension.
//
// Looking up a professor on RateMyProfessors takes a network request. We don't
// want to do that every single time the same name appears on the page, so we
// remember answers in Chrome's local storage for a while. This makes repeat
// browsing instant and keeps our request volume low (which is polite to RMP).

/** How long to trust a successful lookup (7 days, in milliseconds). */
const HIT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** How long to remember a "no match" before trying again (1 day). */
const MISS_TTL_MS = 1 * 24 * 60 * 60 * 1000;

const KEY_PREFIX = 'rmp-cache:';

/**
 * Build the storage key for a given lookup.
 * @param {string} normalizedKey  A stable identity string for the professor.
 * @returns {string}
 */
function storageKey(normalizedKey) {
  return KEY_PREFIX + normalizedKey;
}

/**
 * Read a cached result, or null if missing/expired.
 * @param {string} normalizedKey
 * @returns {Promise<import('./providers/Provider.js').ProviderResult | null>}
 */
export async function getCached(normalizedKey) {
  const key = storageKey(normalizedKey);
  const stored = await chrome.storage.local.get(key);
  const entry = stored[key];
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    await chrome.storage.local.remove(key);
    return null;
  }
  return entry.result;
}

/**
 * Save a result. Chooses the TTL based on whether it was a real hit or a miss.
 * @param {string} normalizedKey
 * @param {import('./providers/Provider.js').ProviderResult} result
 * @returns {Promise<void>}
 */
export async function setCached(normalizedKey, result) {
  const ttl = result.status === 'ok' ? HIT_TTL_MS : MISS_TTL_MS;
  const entry = { result, expiresAt: Date.now() + ttl };
  await chrome.storage.local.set({ [storageKey(normalizedKey)]: entry });
}
