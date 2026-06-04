// Name matching — the trickiest and most important piece.

import { normalizeCourseKey } from './courseKey.js';
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
    } else if (words.length === 2) {
      // "S Weng" — single-letter first + last.
      first = words[0];
      last = words[1];
    } else if (words.length > 2) {
      // "P P Cunningham" / "D L Johnstone" — leading tokens are initials.
      const lastWord = words[words.length - 1];
      const leading = words.slice(0, -1);
      const allInitials = leading.every((w) => w.replace(/[^a-z]/g, '').length <= 2);
      if (allInitials) {
        first = leading
          .map((w) => w.replace(/[^a-z]/g, '')[0] || '')
          .join('');
        last = lastWord.replace(/[^a-z]/g, '');
      } else {
        first = words[0];
        last = lastWord.replace(/[^a-z]/g, '');
      }
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
    if (a.first[0] !== b.first[0]) return 0.4;

    // Same starting letter — full first vs initial(s).
    const aInit = a.first.replace(/[^a-z]/g, '');
    const bInit = b.first.replace(/[^a-z]/g, '');
    if (aInit.length > 1 && bInit.length > 1) return 0.85;
    if (aInit.length === 1 && bInit.length === 1) return aInit === bInit ? 0.85 : 0.4;
    // One side is a single initial (or "pp") matching the other's prefix.
    const short = aInit.length <= bInit.length ? aInit : bInit;
    const long = aInit.length <= bInit.length ? bInit : aInit;
    if (short && long.startsWith(short)) return 0.85;
    return 0.4;
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

/** @type {Record<string, string[]>} */
const DEPT_HINTS_BY_PREFIX = {
  MA: ['mathematics', 'math'],
  CS: ['computer science', 'computer', 'cs'],
  STAT: ['statistics', 'stat'],
  AAE: ['aerospace', 'astronautical', 'aa'],
  ME: ['mechanical'],
  ECE: ['electrical', 'ece'],
  PHYS: ['physics', 'phys'],
  CHEM: ['chemistry', 'chem'],
  BIOL: ['biology', 'biol'],
  ECON: ['economics', 'econ'],
  MGMT: ['management', 'mgmt'],
  AD: ['design', 'art'],
};

/**
 * @param {string} [course]
 * @returns {string[]}
 */
export function departmentHintsFromCourse(course) {
  const key = normalizeCourseKey(course);
  const m = key.match(/^([A-Z&]{2,})/);
  if (!m) return [];
  return DEPT_HINTS_BY_PREFIX[m[1]] || [];
}

/**
 * @param {string} department
 * @param {string[]} hints
 */
function departmentMatchesHints(department, hints) {
  if (!hints.length) return false;
  const d = String(department || '').toLowerCase();
  return hints.some((h) => d.includes(h));
}

/**
 * @param {Array<{c: object, score: number}>} scored
 * @param {string[]} deptHints
 * @returns {Array<{c: object, score: number}>}
 */
function preferDepartmentMatches(scored, deptHints) {
  if (!deptHints.length || scored.length < 2) return scored;
  const deptMatches = scored.filter((s) => departmentMatchesHints(s.c.department, deptHints));
  if (deptMatches.length === 1) return deptMatches;
  if (deptMatches.length > 1) {
    return deptMatches.sort(
      (a, b) => b.score - a.score || (b.c.numRatings || 0) - (a.c.numRatings || 0)
    );
  }
  return scored;
}

/**
 * Choose the single best RMP candidate for a UniTime instructor name, or decide
 * there's no confident/safe match. Conservative on purpose: when two different
 * people match equally well, we return "ambiguous" rather than guessing.
 *
 * @param {string} rawName  The UniTime instructor text, e.g. "S Weng".
 * @param {Array<{firstName:string,lastName:string,numRatings?:number,legacyId?:number,department?:string}>} candidates
 * @param {{ course?: string }} [options]
 * @returns {{candidate: object|null, confidence: number, status: "ok"|"no_match"|"ambiguous"|"staff_tba"}}
 */
export function pickBestCandidate(rawName, candidates, options = {}) {
  const query = normalizeName(rawName);

  if (query.isPlaceholder) return { candidate: null, confidence: 0, status: 'staff_tba' };
  if (!query.last) return { candidate: null, confidence: 0, status: 'no_match' };

  const deptHints = departmentHintsFromCourse(options.course);

  let scored = (candidates || [])
    .map((c) => ({ c, score: scoreMatch(query, normalizeParts(c.firstName, c.lastName)) }))
    .filter((s) => s.score >= CONFIDENCE_THRESHOLD)
    .sort((a, b) => b.score - a.score || (b.c.numRatings || 0) - (a.c.numRatings || 0));

  if (scored.length === 0) return { candidate: null, confidence: 0, status: 'no_match' };

  scored = preferDepartmentMatches(scored, deptHints);

  const top = scored[0];

  // A different person scoring just as high — ambiguous unless one has far more reviews.
  const rival = scored.find((s) => s.c.legacyId !== top.c.legacyId && s.score >= top.score - 0.0001);
  if (rival) {
    const deptMatches = scored.filter((s) => departmentMatchesHints(s.c.department, deptHints));
    if (deptMatches.length === 1) {
      const pick = deptMatches[0];
      if (!pick.c.numRatings) return { candidate: null, confidence: pick.score, status: 'no_match' };
      return { candidate: pick.c, confidence: pick.score, status: 'ok' };
    }

    const topN = top.c.numRatings || 0;
    const rivalN = rival.c.numRatings || 0;
    if (topN >= 10 && topN >= rivalN * 2) {
      return { candidate: top.c, confidence: top.score, status: 'ok' };
    }
    return { candidate: null, confidence: top.score, status: 'ambiguous' };
  }

  // Right person, but no reviews yet — nothing useful to display.
  if (!top.c.numRatings) return { candidate: null, confidence: top.score, status: 'no_match' };

  return { candidate: top.c, confidence: top.score, status: 'ok' };
}

export { PLACEHOLDER_NAMES, TITLES, CONFIDENCE_THRESHOLD };
