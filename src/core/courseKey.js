// Normalize UniTime course strings to match bundled grade-data keys (e.g. "MA 26100").

/**
 * @param {string} course  Raw text like "MA 26100" or "ma  26100"
 * @returns {string}
 */
export function normalizeCourseKey(course) {
  const t = String(course || '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const m = t.match(/^([A-Za-z&]{2,})\s+(\d[\dA-Za-z]*)$/);
  if (!m) return t.toUpperCase();
  return `${m[1].toUpperCase()} ${m[2]}`;
}
