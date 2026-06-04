// Grade-distribution provider: looks up a professor's average GPA for a specific
// course from the bundled BoilerGrades dataset.
//
// Unlike the RMP provider, this needs the COURSE (e.g. "MA 26100") in addition to
// the instructor name, and the lookup is local (no network) — the data ships with
// the extension. Matching on course + last name is highly accurate.

import { RatingProvider } from './Provider.js';
import { normalizeName } from '../matching.js';
import { normalizeCourseKey } from '../courseKey.js';
import { GRADES } from './gradesData.js';

/**
 * True when two strings differ by one insertion/deletion/substitution.
 * Conservative "single-typo" matcher to recover common near-misses like
 * "weng" vs "wen", while avoiding broad fuzzy matching.
 * @param {string} a
 * @param {string} b
 */
function isSingleEditAway(a, b) {
  if (a === b) return false;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    edits++;
    if (edits > 1) return false;

    if (la > lb) {
      i++;
    } else if (lb > la) {
      j++;
    } else {
      i++;
      j++;
    }
  }

  if (i < la || j < lb) edits++;
  return edits === 1;
}

/**
 * Pick one near last-name when UniTime and BoilerGrades disagree slightly
 * (e.g. "Weng" vs dataset "Wen", also "Wong" one edit away).
 * @param {string} last
 * @param {Record<string, { gpa: number, n: number }>} byCourse
 * @returns {string | null}
 */
function pickNearLastName(last, byCourse) {
  const near = Object.keys(byCourse).filter((k) => isSingleEditAway(last, k));
  if (near.length === 0) return null;
  if (near.length === 1) return near[0];

  const prefixHits = near.filter((k) => last.startsWith(k) || k.startsWith(last));
  if (prefixHits.length === 1) return prefixHits[0];

  near.sort((a, b) => (byCourse[b].n || 0) - (byCourse[a].n || 0));
  const top = near[0];
  const runner = near[1];
  if ((byCourse[top].n || 0) >= (byCourse[runner]?.n || 0) * 2) return top;

  return null;
}

export class GradesProvider extends RatingProvider {
  constructor() {
    super('grades');
  }

  /**
   * @param {import('./Provider.js').ProfessorQuery} query
   * @returns {Promise<import('./Provider.js').ProviderResult>}
   */
  async lookup(query) {
    const courseKey = normalizeCourseKey(query.course);
    if (!courseKey) return { source: 'grades', confidence: 0, status: 'no_match' };

    const byCourse = GRADES[courseKey];
    if (!byCourse) return { source: 'grades', confidence: 0, status: 'no_match' };

    const { last, isPlaceholder } = normalizeName(query.rawName);
    if (isPlaceholder || !last) return { source: 'grades', confidence: 0, status: 'no_match' };

    let rec = byCourse[last];
    let confidence = 0.9;

    if (!rec) {
      const nearKey = pickNearLastName(last, byCourse);
      if (nearKey) {
        rec = byCourse[nearKey];
        confidence = 0.8;
      }
    }

    if (!rec) return { source: 'grades', confidence: 0, status: 'no_match' };

    return {
      source: 'grades',
      confidence,
      status: 'ok',
      gpa: rec.gpa,
      gpaSampleSize: rec.n,
      gpaDistribution: rec.dist,
    };
  }
}
