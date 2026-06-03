// The RateMyProfessors provider — v1's only data source.
//
// RateMyProfessors has no official public API, so we talk to the same internal
// GraphQL endpoint their own website uses. The school ID, query shape, and field
// names below were confirmed by querying the live endpoint during the M0/M3
// discovery (see chat history): Purdue West Lafayette resolves to the school ID
// constant below, and a teacher search scoped to it returns the fields we map.
//
// All of this lives in THIS one file on purpose. If RMP ever changes their API,
// this is the only place that needs updating; the rest of the extension just
// consumes the standard ProviderResult shape.

import { RatingProvider } from './Provider.js';
import { normalizeName, pickBestCandidate } from '../matching.js';

const RMP_GRAPHQL_URL = 'https://www.ratemyprofessors.com/graphql';

// Public Basic-auth header that RMP's own frontend sends ("test:test" in base64).
const RMP_AUTH_HEADER = 'Basic dGVzdDp0ZXN0';

// Purdue University - West Lafayette. (Base64 of "School-783".)
const PURDUE_SCHOOL_ID = 'U2Nob29sLTc4Mw==';

const TEACHER_SEARCH_QUERY = `query TeacherSearch($text: String!, $schoolID: ID!) {
  newSearch {
    teachers(query: { text: $text, schoolID: $schoolID }) {
      edges {
        node {
          firstName
          lastName
          department
          avgRating
          avgDifficulty
          numRatings
          wouldTakeAgainPercent
          legacyId
          teacherRatingTags {
            tagName
            tagCount
          }
        }
      }
    }
  }
}`;

export class RmpProvider extends RatingProvider {
  constructor() {
    super('rmp');
  }

  /**
   * @param {import('./Provider.js').ProfessorQuery} query
   * @returns {Promise<import('./Provider.js').ProviderResult>}
   */
  async lookup(query) {
    const name = normalizeName(query.rawName);

    if (name.isPlaceholder) {
      return { source: 'rmp', confidence: 0, status: 'staff_tba' };
    }
    if (!name.last) {
      return { source: 'rmp', confidence: 0, status: 'no_match' };
    }

    let candidates;
    try {
      candidates = await this.#searchTeachers(name.last);
    } catch (err) {
      console.warn('[Purdue RMP] RMP fetch failed:', err);
      return { source: 'rmp', confidence: 0, status: 'fetch_failed' };
    }

    const { candidate, confidence, status } = pickBestCandidate(query.rawName, candidates);

    if (status !== 'ok' || !candidate) {
      return { source: 'rmp', confidence, status };
    }

    const tags = (candidate.teacherRatingTags || [])
      .slice()
      .sort((a, b) => (b.tagCount || 0) - (a.tagCount || 0))
      .slice(0, 3)
      .map((t) => t.tagName);

    return {
      source: 'rmp',
      confidence,
      status: 'ok',
      overall: candidate.avgRating,
      difficulty: candidate.avgDifficulty,
      sampleSize: candidate.numRatings,
      detail: {
        name: `${candidate.firstName} ${candidate.lastName}`.trim(),
        department: candidate.department || undefined,
        wouldTakeAgainPct:
          candidate.wouldTakeAgainPercent >= 0 ? Math.round(candidate.wouldTakeAgainPercent) : undefined,
        tags: tags.length ? tags : undefined,
        profileUrl: candidate.legacyId
          ? `https://www.ratemyprofessors.com/professor/${candidate.legacyId}`
          : undefined,
      },
    };
  }

  /**
   * Query RMP for teachers at Purdue matching a search string (we use last name).
   * @param {string} text
   * @returns {Promise<Array<object>>} the matching teacher nodes
   */
  async #searchTeachers(text) {
    const res = await fetch(RMP_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: RMP_AUTH_HEADER,
      },
      body: JSON.stringify({
        query: TEACHER_SEARCH_QUERY,
        variables: { text, schoolID: PURDUE_SCHOOL_ID },
      }),
    });

    if (!res.ok) throw new Error(`RMP responded ${res.status}`);

    const json = await res.json();
    const edges = json?.data?.newSearch?.teachers?.edges || [];
    return edges.map((e) => e.node).filter(Boolean);
  }
}

export { RMP_GRAPHQL_URL, RMP_AUTH_HEADER, PURDUE_SCHOOL_ID };
