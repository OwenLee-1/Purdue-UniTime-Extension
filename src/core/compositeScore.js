// "Realistic" composite score — one place to tune the formula.
//
// Blends available signals into a single 0–5 style number for comparing sections.
// Weights below are relative; only signals that exist for a professor are used,
// and their weights are re-normalized so missing data doesn't penalize anyone.

/** @typedef {{ label: string, raw: string, weight: number, normalized: number }} CompositePart */

/**
 * Tweak these to change how much each signal matters (relative weights).
 * They need not sum to 1 — we re-normalize over whichever parts are present.
 */
export const COMPOSITE_WEIGHTS = {
  rmpRating: 0.4,
  rmpWouldTakeAgain: 0.12,
  courseGpa: 0.35,
  /** Average star rating on the fetched RMP review snippets (recent pulse). */
  recentReviewAvg: 0.13,
};

/** Minimum recent star ratings before sentiment / composite recent-review signal is shown. */
export const MIN_REVIEWS_FOR_SENTIMENT = 3;

/**
 * Summarize recent RMP review star ratings (structured sentiment — not NLP on text).
 * @param {import('./providers/Provider.js').ReviewSnippet[]} [reviews]
 * @returns {{ avg: number, count: number, tone: string, positivePct: number } | null}
 */
export function summarizeReviewSentiment(reviews) {
  const qualities = (reviews || [])
    .map((r) => r.quality)
    .filter((q) => typeof q === 'number' && q >= 1 && q <= 5);
  if (qualities.length < MIN_REVIEWS_FOR_SENTIMENT) return null;

  const avg = qualities.reduce((s, q) => s + q, 0) / qualities.length;
  const positivePct = Math.round((100 * qualities.filter((q) => q >= 4).length) / qualities.length);

  let tone = 'mixed';
  if (avg >= 4) tone = 'mostly positive';
  else if (avg <= 2.5) tone = 'mostly negative';

  return {
    avg: Math.round(avg * 100) / 100,
    count: qualities.length,
    tone,
    positivePct,
  };
}

/**
 * @param {object} input
 * @param {number} [input.overall]           RMP 0–5
 * @param {number} [input.wouldTakeAgainPct] RMP 0–100
 * @param {number} [input.gpa]               Course GPA 0–4
 * @param {number} [input.recentReviewAvg]   Avg quality stars on fetched reviews 0–5
 * @returns {{ score: number, parts: CompositePart[] } | null}
 */
export function computeComposite(input) {
  const parts = [];

  if (typeof input.overall === 'number' && input.overall >= 0) {
    parts.push({
      label: 'RMP rating',
      raw: `${input.overall.toFixed(1)} / 5`,
      weight: COMPOSITE_WEIGHTS.rmpRating,
      normalized: Math.min(1, input.overall / 5),
    });
  }

  if (typeof input.wouldTakeAgainPct === 'number' && input.wouldTakeAgainPct >= 0) {
    parts.push({
      label: 'Would take again',
      raw: `${Math.round(input.wouldTakeAgainPct)}%`,
      weight: COMPOSITE_WEIGHTS.rmpWouldTakeAgain,
      normalized: Math.min(1, input.wouldTakeAgainPct / 100),
    });
  }

  if (typeof input.gpa === 'number' && input.gpa >= 0) {
    parts.push({
      label: 'Course GPA',
      raw: input.gpa.toFixed(2),
      weight: COMPOSITE_WEIGHTS.courseGpa,
      normalized: Math.min(1, input.gpa / 4),
    });
  }

  if (typeof input.recentReviewAvg === 'number' && input.recentReviewAvg >= 0) {
    parts.push({
      label: 'Recent reviews',
      raw: `${input.recentReviewAvg.toFixed(1)} / 5`,
      weight: COMPOSITE_WEIGHTS.recentReviewAvg,
      normalized: Math.min(1, input.recentReviewAvg / 5),
    });
  }

  if (parts.length === 0) return null;

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const blended = parts.reduce((s, p) => s + p.normalized * p.weight, 0) / totalWeight;

  return {
    score: Math.round(blended * 5 * 100) / 100,
    parts,
  };
}

/**
 * Score used to compare sections (higher = better). Prefer composite when available.
 * @param {import('./providers/Provider.js').ProviderResult} result
 * @returns {number | null}
 */
export function sectionCompareScore(result) {
  if (result?.composite?.score != null) return result.composite.score;
  if (typeof result?.overall === 'number') return result.overall;
  if (typeof result?.gpa === 'number') return (result.gpa / 4) * 5;
  return null;
}
