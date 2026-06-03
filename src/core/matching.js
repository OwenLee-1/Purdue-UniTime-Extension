// Name matching — the trickiest and most important piece.
//
// UniTime shows instructor names in formats like "Doe, Jane M." or "Jane Doe",
// sometimes with titles or accents. RateMyProfessors stores them differently.
// This file turns a raw UniTime string into a clean {first, last} we can match,
// and scores how well two names line up.
//
// Guiding rule: it is far better to show NOTHING than to show the WRONG
// professor's rating. So scoring is intentionally conservative.

/** Words that are not part of a real name and should be dropped. */
const TITLES = new Set(['dr', 'dr.', 'prof', 'prof.', 'professor', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.']);

/** Names UniTime uses when no real instructor is assigned yet. */
const PLACEHOLDER_NAMES = new Set(['staff', 'tba', 'tbd', 'to be announced', 'to be determined']);

/**
 * A normalized name split into parts.
 * @typedef {Object} NormalizedName
 * @property {string} first
 * @property {string} last
 * @property {boolean} isPlaceholder  True for "Staff"/"TBA" etc.
 */

/**
 * Strip accents so "Muñoz" matches "Munoz".
 * @param {string} s
 * @returns {string}
 */
function stripDiacritics(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Turn a raw UniTime instructor string into clean name parts.
 * Handles "Last, First M." and "First Last" formats.
 * @param {string} raw
 * @returns {NormalizedName}
 */
export function normalizeName(raw) {
  const cleaned = stripDiacritics(String(raw || '')).toLowerCase().trim();

  if (PLACEHOLDER_NAMES.has(cleaned)) {
    return { first: '', last: '', isPlaceholder: true };
  }

  // "Last, First" format.
  let first = '';
  let last = '';
  if (cleaned.includes(',')) {
    const [lastPart, firstPart = ''] = cleaned.split(',');
    last = lastPart.trim();
    first = firstPart.trim();
  } else {
    // "First [Middle] Last" — take first word as first, last word as last.
    const words = cleaned.split(/\s+/).filter((w) => !TITLES.has(w));
    if (words.length === 1) {
      last = words[0];
    } else if (words.length > 1) {
      first = words[0];
      last = words[words.length - 1];
    }
  }

  // Drop any leftover middle initials/punctuation from the first name.
  first = first.split(/\s+/)[0]?.replace(/[^a-z]/g, '') || '';
  last = last.replace(/[^a-z]/g, '');

  return { first, last, isPlaceholder: false };
}

/**
 * Score how well two normalized names match, from 0 (no match) to 1 (strong).
 * Last name must match exactly to score at all. First name (or initial) adds confidence.
 * @param {NormalizedName} a
 * @param {NormalizedName} b
 * @returns {number}
 */
export function scoreMatch(a, b) {
  if (!a.last || !b.last) return 0;
  if (a.last !== b.last) return 0;

  // Last names match. Now judge the first name.
  if (a.first && b.first) {
    if (a.first === b.first) return 1.0;
    // Same starting letter (one side might be just an initial).
    if (a.first[0] === b.first[0]) return 0.85;
    return 0.4; // last matches but first clearly differs — risky
  }

  // Only a last name available on one side.
  return 0.6;
}

/**
 * Build a NormalizedName straight from separate first/last parts (as RMP returns them).
 * @param {string} firstName
 * @param {string} lastName
 * @returns {NormalizedName}
 */
export function normalizeParts(firstName, lastName) {
  const first =
    stripDiacritics(String(firstName || ''))
      .toLowerCase()
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[^a-z]/g, '') || '';
  const last = stripDiacritics(String(lastName || ''))
    .toLowerCase()
    .trim()
    .replace(/[^a-z]/g, '');
  return { first, last, isPlaceholder: false };
}

/** Score at or above this means we're confident enough to show a badge. */
const CONFIDENCE_THRESHOLD = 0.8;

/**
 * Choose the single best RMP candidate for a UniTime instructor name, or decide
 * there's no confident/safe match. Conservative on purpose: when two different
 * people match equally well, we return "ambiguous" rather than guessing.
 *
 * @param {string} rawName  The UniTime instructor text, e.g. "S Weng".
 * @param {Array<{firstName:string,lastName:string,numRatings?:number,legacyId?:number}>} candidates
 * @returns {{candidate: object|null, confidence: number, status: "ok"|"no_match"|"ambiguous"|"staff_tba"}}
 */
export function pickBestCandidate(rawName, candidates) {
  const query = normalizeName(rawName);

  if (query.isPlaceholder) return { candidate: null, confidence: 0, status: 'staff_tba' };
  if (!query.last) return { candidate: null, confidence: 0, status: 'no_match' };

  const scored = (candidates || [])
    .map((c) => ({ c, score: scoreMatch(query, normalizeParts(c.firstName, c.lastName)) }))
    .filter((s) => s.score >= CONFIDENCE_THRESHOLD)
    .sort((a, b) => b.score - a.score || (b.c.numRatings || 0) - (a.c.numRatings || 0));

  if (scored.length === 0) return { candidate: null, confidence: 0, status: 'no_match' };

  const top = scored[0];

  // A different person scoring just as high means we can't safely disambiguate.
  const rival = scored.find((s) => s.c.legacyId !== top.c.legacyId && s.score >= top.score - 0.0001);
  if (rival) return { candidate: null, confidence: top.score, status: 'ambiguous' };

  // Right person, but no reviews yet — nothing useful to display.
  if (!top.c.numRatings) return { candidate: null, confidence: top.score, status: 'no_match' };

  return { candidate: top.c, confidence: top.score, status: 'ok' };
}

export { PLACEHOLDER_NAMES, TITLES, CONFIDENCE_THRESHOLD };
