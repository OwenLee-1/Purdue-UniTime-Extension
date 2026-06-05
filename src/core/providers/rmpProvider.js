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
          ratings(first: 12) {
            edges {
              node {
                comment
                class
                date
                qualityRating
                difficultyRatingRounded
              }
            }
          }
        }
      }
    }
  }
}`;

const MAX_COMMENT_SNIPPETS = 5;

/**
 * @param {object} node
 * @returns {import('./Provider.js').ReviewSnippet}
 */
function mapRatingNode(node) {
  return {
    comment: String(node.comment || '').trim(),
    class: node.class || undefined,
    quality: toNum(node.qualityRating),
    difficulty: toNum(node.difficultyRatingRounded),
  };
}

/**
 * Comment snippets for the hover card plus star ratings for sentiment (larger n).
 * @param {object} candidate
 * @returns {{ reviews: import('./Provider.js').ReviewSnippet[], recentRatings: import('./Provider.js').ReviewSnippet[] }}
 */
function extractReviewData(candidate) {
  const nodes = (candidate.ratings?.edges || []).map((e) => e.node).filter(Boolean);

  const recentRatings = nodes
    .map(mapRatingNode)
    .filter((r) => typeof r.quality === 'number' && r.quality >= 1 && r.quality <= 5);

  const reviews = nodes
    .filter((n) => String(n.comment || '').trim())
    .slice(0, MAX_COMMENT_SNIPPETS)
    .map(mapRatingNode);

  return { reviews, recentRatings };
}

/** @param {*} v */
function toNum(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

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

    const words = String(query.rawName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    // Prefer last-name search before "S Last" — reduces false ambiguous matches at Purdue.
    const searchTerms = [name.last];
    if (name.first && name.first.length > 1) {
      searchTerms.unshift(`${name.first} ${name.last}`);
    }
    if (name.first && name.first.length === 1) {
      searchTerms.push(`${name.first} ${name.last}`);
    }
    if (words.length >= 3) {
      searchTerms.unshift(words.join(' '));
    }

    let candidates = [];
    let pick = { candidate: null, confidence: 0, status: 'no_match' };

    try {
      for (const term of searchTerms) {
        candidates = await this.#searchTeachers(term);
        const attempt = pickBestCandidate(query.rawName, candidates, {
          course: query.course,
        });
        if (attempt.status === 'ok') {
          pick = attempt;
          break;
        }
        if (attempt.status === 'ambiguous') {
          pick = attempt;
          break;
        }
        if (attempt.confidence > pick.confidence) pick = attempt;
      }
    } catch (err) {
      const errorDetail = err instanceof Error ? err.message : String(err);
      console.warn('[Purdue RMP] RMP fetch failed:', errorDetail);
      return { source: 'rmp', confidence: 0, status: 'fetch_failed', errorDetail };
    }

    let { candidate, confidence, status } = pick;

    if (status !== 'ok' || !candidate) {
      return { source: 'rmp', confidence, status };
    }

    let { reviews, recentRatings } = extractReviewData(candidate);

    // Some searches return the right professor but an empty ratings list; retry with
    // a fuller name string when RMP says there are ratings.
    if (!reviews.length && !recentRatings.length && candidate.numRatings > 0 && name.first) {
      const fullText = `${name.first} ${name.last}`.trim();
      if (fullText !== name.last) {
        try {
          const retry = await this.#searchTeachers(fullText);
          const retryPick = pickBestCandidate(query.rawName, retry, { course: query.course });
          if (retryPick.status === 'ok' && retryPick.candidate?.legacyId === candidate.legacyId) {
            const retryData = extractReviewData(retryPick.candidate);
            if (retryData.reviews.length || retryData.recentRatings.length) {
              reviews = retryData.reviews;
              recentRatings = retryData.recentRatings;
            }
          }
        } catch {
          /* keep original */
        }
      }
    }

    const tags = (candidate.teacherRatingTags || [])
      .slice()
      .sort((a, b) => (b.tagCount || 0) - (a.tagCount || 0))
      .slice(0, 3)
      .map((t) => t.tagName);

    const overall = toNum(candidate.avgRating);
    const difficulty = toNum(candidate.avgDifficulty);

    if (overall === undefined) {
      return { source: 'rmp', confidence, status: 'no_match' };
    }

    return {
      source: 'rmp',
      confidence,
      status: 'ok',
      overall,
      difficulty,
      sampleSize: candidate.numRatings,
      detail: {
        name: `${candidate.firstName} ${candidate.lastName}`.trim(),
        department: candidate.department || undefined,
        wouldTakeAgainPct:
          candidate.wouldTakeAgainPercent >= 0 ? Math.round(candidate.wouldTakeAgainPercent) : undefined,
        tags: tags.length ? tags : undefined,
        reviews: reviews.length ? reviews : undefined,
        recentRatings: recentRatings.length ? recentRatings : undefined,
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
    // Omit cookies and keep headers minimal — browser cookie jars caused RMP 400
    // "Request Header Or Cookie Too Large" from the extension context.
    const res = await fetch(RMP_GRAPHQL_URL, {
      method: 'POST',
      credentials: 'omit',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: RMP_AUTH_HEADER,
      },
      body: JSON.stringify({
        query: TEACHER_SEARCH_QUERY,
        variables: { text, schoolID: PURDUE_SCHOOL_ID },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`RMP responded ${res.status}${body ? `: ${body.slice(0, 120)}` : ''}`);
    }

    const json = await res.json();
    if (json?.errors?.length) {
      const msg = json.errors.map((e) => e?.message).filter(Boolean).join('; ');
      throw new Error(msg || 'RMP GraphQL error');
    }
    const edges = json?.data?.newSearch?.teachers?.edges || [];
    return edges.map((e) => e.node).filter(Boolean);
  }
}

export { RMP_GRAPHQL_URL, RMP_AUTH_HEADER, PURDUE_SCHOOL_ID };
