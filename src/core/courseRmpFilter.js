// Match RateMyProfessors review "class" strings to a UniTime course key (e.g. MA 26100).

import { normalizeCourseKey } from './courseKey.js';
import { summarizeReviewSentiment } from './compositeScore.js';

/** @typedef {import('./providers/Provider.js').ReviewSnippet} ReviewSnippet */

/**
 * @typedef {Object} CourseRmpSnapshot
 * @property {string} courseKey
 * @property {number} [overall]
 * @property {number} [difficulty]
 * @property {number} sampleSize
 * @property {ReviewSnippet[]} reviews
 * @property {ReviewSnippet[]} recentRatings
 * @property {{ avg: number, count: number, tone: string, positivePct: number }} [reviewSentiment]
 * @property {boolean} hasEnoughForAverage
 */

/** @type {Record<string, string[]>} */
const SUBJECT_ALIASES = {
  MA: ['MA', 'MATH', 'MATHEMATICS', 'MAT'],
  CS: ['CS', 'COMP', 'COMPSCI', 'COMPUTER', 'CSC'],
  STAT: ['STAT', 'STATISTICS'],
  AAE: ['AAE', 'AERO', 'AEROSPACE'],
  ME: ['ME', 'MECH', 'MECHANICAL'],
  ECE: ['ECE', 'EE', 'ELECTRICAL'],
  PHYS: ['PHYS', 'PHYSICS'],
  CHM: ['CHM', 'CHEM', 'CHEMISTRY'],
  CHEM: ['CHM', 'CHEM', 'CHEMISTRY'],
  BIOL: ['BIOL', 'BIO', 'BIOLOGY'],
  ECON: ['ECON', 'ECONOMICS'],
  MGMT: ['MGMT', 'MANAGEMENT', 'MGT'],
  AD: ['AD', 'DESIGN'],
  ENGR: ['ENGR', 'ENGINEERING'],
  EAPS: ['EAPS', 'GEOL', 'EARTH'],
  PSY: ['PSY', 'PSYCH', 'PSYCHOLOGY'],
  ENGL: ['ENGL', 'ENGLISH'],
  COM: ['COM', 'COMM', 'COMMUNICATION'],
  MKT: ['MKT', 'MKTG', 'MARKETING'],
  FIN: ['FIN', 'FINANCE'],
  IE: ['IE', 'INDE', 'INDUSTRIAL'],
  CE: ['CE', 'CIVL', 'CIVIL'],
};

const MIN_COURSE_RMP_RATINGS = 3;

/**
 * @param {string} courseNumber  e.g. "26100"
 * @returns {string[]}
 */
function courseNumberVariants(courseNumber) {
  const n = String(courseNumber || '').replace(/\D/g, '');
  if (!n) return [];
  const variants = new Set([n]);
  if (n.length === 5 && n.endsWith('00')) {
    variants.add(n.slice(0, 3));
    variants.add(n.slice(0, 4));
  }
  if (n.length === 3) variants.add(`${n}00`);
  if (n.length === 4 && n.endsWith('0')) variants.add(n.slice(0, 3));
  return [...variants].filter(Boolean);
}

/**
 * @param {string} rmpClass
 * @returns {{ subjects: string[], numbers: string[] }}
 */
function parseRmpClass(rmpClass) {
  const raw = String(rmpClass || '').toUpperCase();
  const compact = raw.replace(/[^A-Z0-9&]/g, '');
  const numbers = (raw.match(/\d{2,5}/g) || []).flatMap((n) => courseNumberVariants(n));
  const subjects = (raw.match(/[A-Z&]{2,}/g) || [])
    .map((s) => s.replace(/&/g, ''))
    .filter((s) => !/^\d+$/.test(s));
  if (compact) {
    const m = compact.match(/^([A-Z&]{2,})(\d{2,5})/);
    if (m) {
      subjects.push(m[1].replace(/&/g, ''));
      numbers.push(...courseNumberVariants(m[2]));
    }
  }
  return { subjects: [...new Set(subjects)], numbers: [...new Set(numbers)] };
}

/**
 * @param {string} subjectCode  e.g. "MA"
 * @param {string} rmpSubject
 */
function subjectsCompatible(subjectCode, rmpSubject) {
  if (!subjectCode || !rmpSubject) return false;
  if (subjectCode === rmpSubject) return true;
  if (rmpSubject.startsWith(subjectCode) || subjectCode.startsWith(rmpSubject)) return true;
  const left = SUBJECT_ALIASES[subjectCode] || [subjectCode];
  const right = SUBJECT_ALIASES[rmpSubject] || [rmpSubject];
  return left.some((a) =>
    right.some((b) => a === b || a.startsWith(b) || b.startsWith(a))
  );
}

/**
 * @param {string} [courseKey]
 * @param {string} [rmpClass]
 */
export function courseMatchesRmpClass(courseKey, rmpClass) {
  const key = normalizeCourseKey(courseKey);
  const m = key.match(/^([A-Z&]{2,})\s+(\d{3,5})/);
  if (!m || !rmpClass) return false;

  const [, subject, number] = m;
  const parsed = parseRmpClass(rmpClass);
  const numberVariants = courseNumberVariants(number);

  const numberHit = parsed.numbers.some((n) => numberVariants.includes(n));
  if (!numberHit) return false;

  if (!parsed.subjects.length) return numberHit;

  return parsed.subjects.some((s) => subjectsCompatible(subject, s));
}

/**
 * @param {ReviewSnippet[]} list
 */
function dedupeRatings(list) {
  const seen = new Set();
  /** @type {ReviewSnippet[]} */
  const out = [];
  for (const r of list || []) {
    const key = `${r.class || ''}|${r.quality ?? ''}|${r.difficulty ?? ''}|${(r.comment || '').slice(0, 48)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export function filterReviewsByCourse(list, courseKey) {
  if (!courseKey) return [];
  return (list || []).filter((r) => courseMatchesRmpClass(courseKey, r.class));
}

/**
 * @param {ReviewSnippet[]} ratings
 */
function averageQuality(ratings) {
  const qualities = (ratings || [])
    .map((r) => r.quality)
    .filter((q) => typeof q === 'number' && q >= 1 && q <= 5);
  if (!qualities.length) return undefined;
  return qualities.reduce((s, q) => s + q, 0) / qualities.length;
}

/**
 * @param {ReviewSnippet[]} ratings
 */
function averageDifficulty(ratings) {
  const diffs = (ratings || [])
    .map((r) => r.difficulty)
    .filter((d) => typeof d === 'number' && d >= 1 && d <= 5);
  if (!diffs.length) return undefined;
  return diffs.reduce((s, d) => s + d, 0) / diffs.length;
}

/**
 * Build course-scoped RMP stats from the latest fetched review batch.
 * @param {string} [courseKey]
 * @param {ReviewSnippet[]} [reviews]
 * @param {ReviewSnippet[]} [recentRatings]
 */
export function buildCourseRmpSnapshot(courseKey, reviews, recentRatings) {
  const key = normalizeCourseKey(courseKey);
  if (!key) return null;

  const pool = dedupeRatings([...(recentRatings || []), ...(reviews || [])]);
  const courseRecent = filterReviewsByCourse(pool, key);
  const courseReviews = filterReviewsByCourse(reviews, key);
  const sampleSize = courseRecent.length;

  if (!sampleSize && !courseReviews.length) {
    return null;
  }

  const overall = averageQuality(courseRecent);
  const difficulty = averageDifficulty(courseRecent);
  const hasEnoughForAverage =
    sampleSize >= MIN_COURSE_RMP_RATINGS && typeof overall === 'number' && Number.isFinite(overall);
  const reviewSentiment = summarizeReviewSentiment(courseRecent);

  return {
    courseKey: key,
    overall: hasEnoughForAverage ? Math.round(overall * 100) / 100 : undefined,
    difficulty:
      typeof difficulty === 'number' && Number.isFinite(difficulty)
        ? Math.round(difficulty * 100) / 100
        : undefined,
    sampleSize,
    reviews: courseReviews,
    recentRatings: courseRecent,
    reviewSentiment: reviewSentiment || undefined,
    hasEnoughForAverage,
  };
}

export { MIN_COURSE_RMP_RATINGS };
