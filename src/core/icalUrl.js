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
 * True when a URL is a Purdue UniTime iCalendar / calendar subscribe feed.
 *
 * UniTime Personal Schedule "Copy iCalendar URL" uses `output=events.ics`.
 * The same Export menu also emits csv/pdf/xls/json feeds via `/export?output=…`,
 * so generic `output=` or "long /export URL" heuristics are unsafe.
 *
 * @param {string} url
 */
export function looksLikeIcalUrl(url) {
  const u = normalizeIcalUrl(url);
  if (!/^https?:\/\//i.test(u)) return false;
  if (!/mypurdue\.purdue\.edu|\.purdue\.edu/i.test(u)) return false;

  // UniTime iCal exporter reference: events.ics
  if (/\.ics\b/i.test(u)) return true;
  // Explicit iCalendar / ical markers in path or query.
  if (/icalendar/i.test(u)) return true;
  if (/(?:^|[?&/_.-])ical(?:[=&/?._-]|$)/i.test(u)) return true;
  if (/[?&](?:output|type|format)=(?:ical|calendar)\b/i.test(u)) return true;
  // Student Scheduling Assistant calendar servlet: /calendar?sid=…&cid=…
  if (/\/calendar\?/i.test(u) && /[?&](?:sid|cid)=/i.test(u)) return true;

  return false;
}
