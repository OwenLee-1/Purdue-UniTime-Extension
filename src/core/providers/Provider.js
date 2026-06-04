// The "provider contract".
//
// A provider is anything that can look up information about a professor and
// return it in ONE standard shape. v1 has a single provider (RateMyProfessors),
// but later we can add more (grade distributions, Reddit sentiment) without
// changing any of the page/badge code — they just have to return this same
// shape. That is the whole point of having a contract.
//
// JavaScript has no "interfaces" like some languages, so we describe the shape
// two ways:
//   1. JSDoc @typedef comments below (documentation your editor understands)
//   2. A small base class that real providers extend

/**
 * What the page knows about a professor when it asks for a lookup.
 * @typedef {Object} ProfessorQuery
 * @property {string} rawName    The instructor text exactly as UniTime shows it.
 * @property {string} [department] Department, if we can derive it from the course.
 * @property {string} [course]   Course code like "MA 26100" — needed for course-specific GPA.
 * @property {"purdue"} school   Hardcoded for v1; the field exists so multi-school is easy later.
 */

/**
 * The single standard result shape every provider must return.
 * @typedef {Object} ProviderResult
 * @property {"rmp"|"grades"|"reddit"} source  Which provider produced this.
 * @property {number} confidence  0..1 — how sure we are about the match. Drives whether we draw a badge.
 * @property {"ok"|"no_match"|"ambiguous"|"fetch_failed"|"staff_tba"} status  Outcome of the lookup.
 * @property {number} [overall]     Overall star rating.
 * @property {number} [difficulty]  Difficulty rating.
 * @property {number} [sampleSize]  Number of ratings (a trust signal).
 * @property {number} [gpa]         Average GPA for this course+instructor (from grade data).
 * @property {number} [gpaSampleSize]  How many sections that GPA averages over.
 * @property {{A:number,B:number,C:number,D:number,F:number}} [gpaDistribution]  Avg letter-grade %.
 * @property {{ score: number, parts: import('../compositeScore.js').CompositePart[] }} [composite]
 * @property {{ avg: number, count: number, tone: string, positivePct: number }} [reviewSentiment]
 * @property {ProviderDetail} [detail]  Extra info shown in the hover card.
 */

/**
 * The richer details revealed on hover.
 * @typedef {Object} ProviderDetail
 * @property {number} [wouldTakeAgainPct]
 * @property {string[]} [tags]
 * @property {ReviewSnippet[]} [reviews]
 * @property {string} [profileUrl]
 */

/**
 * A single RateMyProfessors review shown in the hover card.
 * @typedef {Object} ReviewSnippet
 * @property {string} comment
 * @property {string} [class]
 * @property {number} [quality]     1..5
 * @property {number} [difficulty]  1..5
 */

/**
 * Base class for all providers. Real providers extend this and implement lookup().
 */
export class RatingProvider {
  /**
   * @param {"rmp"|"grades"|"reddit"} id  A short name identifying this provider.
   */
  constructor(id) {
    this.id = id;
  }

  /**
   * Look up a professor and return a ProviderResult.
   * Subclasses MUST override this.
   * @param {ProfessorQuery} _query
   * @returns {Promise<ProviderResult>}
   */
  // eslint-disable-next-line no-unused-vars
  async lookup(_query) {
    throw new Error(`Provider "${this.id}" must implement lookup()`);
  }
}
