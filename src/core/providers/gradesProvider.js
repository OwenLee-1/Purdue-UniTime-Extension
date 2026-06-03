// Grade-distribution provider: looks up a professor's average GPA for a specific
// course from the bundled BoilerGrades dataset.
//
// Unlike the RMP provider, this needs the COURSE (e.g. "MA 26100") in addition to
// the instructor name, and the lookup is local (no network) — the data ships with
// the extension. Matching on course + last name is highly accurate.

import { RatingProvider } from './Provider.js';
import { normalizeName } from '../matching.js';
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
      i++; // deletion from a
    } else if (lb > la) {
      j++; // insertion into a
    } else {
      i++;
      j++; // substitution
    }
  }

  if (i < la || j < lb) edits++;
  return edits === 1;
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
    if (!query.course) return { source: 'grades', confidence: 0, status: 'no_match' };

    const byCourse = GRADES[query.course];
    if (!byCourse) return { source: 'grades', confidence: 0, status: 'no_match' };

    const { last, isPlaceholder } = normalizeName(query.rawName);
    if (isPlaceholder || !last) return { source: 'grades', confidence: 0, status: 'no_match' };

    let rec = byCourse[last];
    let confidence = 0.9;

    if (!rec) {
      // Fallback: allow a single-edit near-match only if exactly one candidate
      // exists in this course. This recovers minor source-name mismatches while
      // staying conservative.
      const near = Object.keys(byCourse).filter((k) => isSingleEditAway(last, k));
      if (near.length === 1) {
        rec = byCourse[near[0]];
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
    };
  }
}
