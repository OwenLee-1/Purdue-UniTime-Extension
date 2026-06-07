// Shared UniTime iCalendar URL helpers (popup + content scraper).

export const ICAL_STORAGE_KEY = 'icalUrl';
export const ICAL_DETECTED_AT_KEY = 'icalUrlDetectedAt';
export const ICAL_SOURCE_KEY = 'icalUrlSource';

/**
 * @param {string} raw
 */
export function normalizeIcalUrl(raw) {
  return String(raw || '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

/**
 * @param {string} url
 */
export function looksLikeIcalUrl(url) {
  const u = normalizeIcalUrl(url);
  if (!/^https?:\/\//i.test(u)) return false;
  if (!/mypurdue\.purdue\.edu|\.purdue\.edu/i.test(u)) return false;
  if (/ical|icalendar|calendar\.ics/i.test(u)) return true;
  if (/\/export\b/i.test(u) && /calendar|ical|output=/i.test(u)) return true;
  if (/\/export\b/i.test(u) && u.length >= 72) return true;
  return false;
}
