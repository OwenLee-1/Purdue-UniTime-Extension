// Merge RMP + course GPA into one badge result.

import { computeComposite, summarizeReviewSentiment } from './compositeScore.js';

/** @param {*} v @returns {number|undefined} */
function toNum(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * @param {import('./providers/Provider.js').ProviderResult | null} rmpRes
 * @param {import('./providers/Provider.js').ProviderResult | null} gradesRes
 * @param {string} [course]
 */
export function mergeResults(rmpRes, gradesRes, course) {
  const merged = {
    source: 'rmp',
    confidence: rmpRes?.confidence ?? 0,
    status: rmpRes?.status || 'no_match',
    rmpStatus: rmpRes?.status || 'no_match',
    course,
    rmpFetchedIn: rmpRes?.rmpFetchedIn || 'background',
    rmpErrorDetail: rmpRes?.errorDetail,
  };

  const overall = toNum(rmpRes?.overall);
  if (rmpRes?.status === 'ok' && overall !== undefined) {
    merged.status = 'ok';
    merged.overall = overall;
    merged.difficulty = toNum(rmpRes.difficulty);
    merged.sampleSize = rmpRes.sampleSize;
    merged.detail = rmpRes.detail ? { ...rmpRes.detail } : undefined;
  }

  if (gradesRes?.status === 'ok') {
    merged.gpa = gradesRes.gpa;
    merged.gpaSampleSize = gradesRes.gpaSampleSize;
    merged.gpaDistribution = gradesRes.gpaDistribution;
    if (merged.overall === undefined) merged.status = 'ok';
  }

  const reviewSentiment = summarizeReviewSentiment(merged.detail?.reviews);
  if (reviewSentiment) merged.reviewSentiment = reviewSentiment;

  const composite = computeComposite({
    overall: merged.overall,
    wouldTakeAgainPct: merged.detail?.wouldTakeAgainPct,
    gpa: merged.gpa,
    recentReviewAvg: reviewSentiment?.avg,
  });
  if (composite) merged.composite = composite;

  return merged;
}
