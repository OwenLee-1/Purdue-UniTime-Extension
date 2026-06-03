// Grade-distribution provider: looks up a professor's average GPA for a specific
// course from the bundled BoilerGrades dataset.
//
// Unlike the RMP provider, this needs the COURSE (e.g. "MA 26100") in addition to
// the instructor name, and the lookup is local (no network) — the data ships with
// the extension. Matching on course + last name is highly accurate.

import { RatingProvider } from './Provider.js';
import { normalizeName } from '../matching.js';
import { GRADES } from './gradesData.js';

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

    const rec = byCourse[last];
    if (!rec) return { source: 'grades', confidence: 0, status: 'no_match' };

    return {
      source: 'grades',
      confidence: 0.9,
      status: 'ok',
      gpa: rec.gpa,
      gpaSampleSize: rec.n,
    };
  }
}
