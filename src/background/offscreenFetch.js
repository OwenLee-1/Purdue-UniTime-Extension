// Offscreen document fallback for RMP GraphQL when service-worker fetch fails.
//
// Chrome requires a static HTML page URL for offscreen documents — never pass a
// CRXJS `?script` loader (that emits a .js asset and createDocument fails).

/** Extension-relative path emitted by the Vite/CRX build (see vite.config.js). */
export const OFFSCREEN_DOCUMENT_PATH = 'src/offscreen/index.html';

let creatingOffscreen = null;

/**
 * Resolve the offscreen HTML URL for chrome.offscreen.createDocument.
 * @param {{ getURL?: (path: string) => string } | undefined} runtime
 * @returns {string}
 */
export function resolveOffscreenDocumentUrl(runtime = chrome?.runtime) {
  if (typeof runtime?.getURL !== 'function') {
    throw new Error('chrome.runtime.getURL unavailable');
  }
  return runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
}

export async function ensureOffscreenDocument() {
  if (creatingOffscreen) return creatingOffscreen;

  creatingOffscreen = (async () => {
    const existing = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });
    if (existing.length) return;

    await chrome.offscreen.createDocument({
      url: resolveOffscreenDocumentUrl(),
      reasons: ['DOM_SCRAPING'],
      justification: 'Fetch RMP ratings and summarize review text with Chrome built-in AI',
    });
  })();

  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

/**
 * @param {object} query
 * @returns {Promise<import('../core/providers/Provider.js').ProviderResult | null>}
 */
export async function lookupRmpViaOffscreen(query) {
  await ensureOffscreenDocument();

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'RMP_OFFSCREEN_LOOKUP', query }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[Purdue RMP] offscreen message error:', chrome.runtime.lastError.message);
        resolve(null);
        return;
      }
      if (!response?.ok || !response.result) {
        console.warn('[Purdue RMP] offscreen lookup failed:', response?.error);
        resolve(null);
        return;
      }
      resolve({ ...response.result, rmpFetchedIn: 'offscreen' });
    });
  });
}

/**
 * @param {string[]} texts
 * @returns {Promise<{ ok: boolean, summaries?: string[], engine?: string, error?: string }>}
 */
export async function summarizeReviewsViaOffscreen(texts) {
  const list = (texts || []).map((t) => String(t || '').trim()).filter(Boolean);
  if (!list.length) return { ok: true, summaries: [] };

  await ensureOffscreenDocument();

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'SUMMARIZE_REVIEWS_OFFSCREEN', texts: list }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(
        response && typeof response === 'object'
          ? response
          : { ok: false, error: 'No summarizer response' }
      );
    });
  });
}
