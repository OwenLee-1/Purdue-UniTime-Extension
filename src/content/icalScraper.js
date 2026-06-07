// Auto-detect UniTime iCalendar subscription URLs from the live page.

import {
  ICAL_DETECTED_AT_KEY,
  ICAL_SOURCE_KEY,
  ICAL_STORAGE_KEY,
  looksLikeIcalUrl,
  normalizeIcalUrl,
} from '../core/icalUrl.js';

const URL_IN_TEXT_RE = /https?:\/\/[^\s"'<>]+/gi;

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractUrlsFromText(text) {
  const raw = String(text || '');
  const found = raw.match(URL_IN_TEXT_RE) || [];
  return [...new Set(found.map((u) => normalizeIcalUrl(u)).filter(looksLikeIcalUrl))];
}

/**
 * @param {string} url
 * @param {string} source
 */
async function persistIcalUrl(url, source) {
  const normalized = normalizeIcalUrl(url);
  if (!looksLikeIcalUrl(normalized)) return false;

  const stored = await chrome.storage.local.get([ICAL_STORAGE_KEY]);
  if (stored[ICAL_STORAGE_KEY] === normalized) return true;

  await chrome.storage.local.set({
    [ICAL_STORAGE_KEY]: normalized,
    [ICAL_DETECTED_AT_KEY]: Date.now(),
    [ICAL_SOURCE_KEY]: source,
  });
  console.log('[Purdue RMP] iCal URL auto-detected from', source);
  return true;
}

/**
 * @param {ParentNode} root
 */
function scanRoot(root = document) {
  const candidates = [];

  for (const el of root.querySelectorAll('a[href], input, textarea')) {
    const value =
      el instanceof HTMLAnchorElement
        ? el.href
        : /** @type {HTMLInputElement} */ (el).value || el.textContent || '';
    for (const url of extractUrlsFromText(value)) candidates.push(url);
  }

  for (const el of root.querySelectorAll('.gwt-DialogBox, [role="dialog"], .unitime-Dialog')) {
    for (const url of extractUrlsFromText(el.textContent || '')) candidates.push(url);
  }

  return candidates;
}

async function scanPage(source = 'page-scan') {
  const candidates = scanRoot(document);
  if (!candidates.length) return false;
  return persistIcalUrl(candidates[0], source);
}

/**
 * Watch Export → iCalendar flows and clipboard copies on UniTime.
 */
export function startIcalScraper() {
  scanPage('initial-scan').catch((err) => console.warn('[Purdue RMP] iCal scan failed:', err));

  let timer = null;
  const observer = new MutationObserver(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      scanPage('dom-update').catch(() => {});
    }, 400);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener(
    'click',
    (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      const label = (target.textContent || '').trim().toLowerCase();
      if (!label.includes('ical') && !label.includes('calendar url')) return;
      setTimeout(() => scanPage('export-dialog').catch(() => {}), 600);
      setTimeout(() => scanPage('export-dialog-late').catch(() => {}), 1500);
    },
    true
  );

  document.addEventListener('copy', () => {
    const text = window.getSelection()?.toString() || '';
    const urls = extractUrlsFromText(text);
    if (urls[0]) persistIcalUrl(urls[0], 'clipboard-copy').catch(() => {});
  });
}
