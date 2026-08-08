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

/**
 * Subject aliases must be exact tokens/phrases (spaces stripped), never bare words that
 * appear inside other departments (e.g. COMPUTER ⊂ COMPUTER ENGINEERING).
 * @type {Record<string, string[]>}
 */
const SUBJECT_ALIASES = {
  MA: ['MA', 'MATH', 'MATHEMATICS', 'MAT'],
  // Bare COMPUTER is safe: multi-word tags become one token (COMPUTERENGINEERING).
  CS: ['CS', 'COMP', 'COMPSCI', 'COMPUTER', 'COMPUTERSCIENCE', 'CSC'],
  STAT: ['STAT', 'STATISTICS'],
  AAE: ['AAE', 'AERO', 'AEROSPACE', 'AEROSPACEENGINEERING'],
  ME: ['ME', 'MECH', 'MECHANICAL', 'MECHANICALENGINEERING'],
  ECE: ['ECE', 'EE', 'ELECTRICAL', 'ELECTRICALENGINEERING', 'ELECTRICALANDCOMPUTERENGINEERING'],
  PHYS: ['PHYS', 'PHYSICS'],
  CHM: ['CHM', 'CHEM', 'CHEMISTRY'],
  CHEM: ['CHM', 'CHEM', 'CHEMISTRY'],
  BIOL: ['BIOL', 'BIO', 'BIOLOGY', 'BIOLOGICALSCIENCES'],
  ECON: ['ECON', 'ECONOMICS'],
  MGMT: ['MGMT', 'MANAGEMENT', 'MGT'],
  AD: ['AD', 'DESIGN', 'ARTDESIGN', 'ARTANDDESIGN', 'VISUALCOMMUNICATIONDESIGN'],
  ENGR: ['ENGR', 'ENGINEERING'],
  EAPS: ['EAPS', 'GEOL', 'EARTH', 'EARTHATMOSPHERICANDPLANETARYSCIENCES'],
  PSY: ['PSY', 'PSYCH', 'PSYCHOLOGY'],
  ENGL: ['ENGL', 'ENGLISH'],
  COM: ['COM', 'COMM', 'COMMUNICATION'],
  MKT: ['MKT', 'MKTG', 'MARKETING'],
  FIN: ['FIN', 'FINANCE'],
  IE: ['IE', 'INDE', 'INDUSTRIAL', 'INDUSTRIALENGINEERING'],
  CE: ['CE', 'CIVL', 'CIVIL', 'CIVILENGINEERING'],
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
  // Purdue undergrad numbers are often 5 digits ending in 00; RMP commonly uses the
  // 3-digit stem (18000 ↔ 180). Do not bridge via 4-digit forms (18000 ↮ 1800).
  if (n.length === 5 && n.endsWith('00')) {
    variants.add(n.slice(0, 3));
  }
  if (n.length === 3) variants.add(`${n}00`);
  return [...variants].filter(Boolean);
}

/**
 * Normalize a subject token/phrase: strip non-letters and uppercase.
 * "Computer Science" → "COMPUTERSCIENCE"
 * @param {string} value
 */
function normalizeSubjectToken(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

/**
 * @param {string} rmpClass
 * @returns {{ subjects: string[], numbers: string[] }}
 */
function parseRmpClass(rmpClass) {
  const raw = String(rmpClass || '').toUpperCase();
  const compact = raw.replace(/[^A-Z0-9&]/g, '');
  /** @type {Set<string>} */
  const subjects = new Set();
  /** @type {Set<string>} */
  const numbers = new Set();

  // Take the letter/word run immediately before each number as one subject phrase.
  // "COMPUTER ENGINEERING 180" → COMPUTERENGINEERING (not COMPUTER + ENGINEERING).
  const prefixed = /([A-Z][A-Z\s&]*?)(\d{2,5})/g;
  let match;
  while ((match = prefixed.exec(raw)) !== null) {
    const subject = normalizeSubjectToken(match[1]);
    if (subject.length >= 2) subjects.add(subject);
    for (const variant of courseNumberVariants(match[2])) numbers.add(variant);
  }

  if (compact) {
    const m = compact.match(/^([A-Z&]{2,})(\d{2,5})/);
    if (m) {
      subjects.add(normalizeSubjectToken(m[1]));
      for (const variant of courseNumberVariants(m[2])) numbers.add(variant);
    }
  }

  return { subjects: [...subjects], numbers: [...numbers] };
}

/**
 * @param {string} subjectCode  e.g. "MA"
 * @param {string} rmpSubject
 */
function subjectsCompatible(subjectCode, rmpSubject) {
  if (!subjectCode || !rmpSubject) return false;
  const leftCode = normalizeSubjectToken(subjectCode);
  const rightCode = normalizeSubjectToken(rmpSubject);
  if (!leftCode || !rightCode) return false;
  if (leftCode === rightCode) return true;

  const left = (SUBJECT_ALIASES[subjectCode] || [subjectCode]).map(normalizeSubjectToken);
  // RMP side is a parsed phrase (e.g. COMPUTERSCIENCE), not a UniTime code — compare
  // against that token directly plus any aliases if the token happens to be a known code.
  const right = (SUBJECT_ALIASES[rmpSubject] || [rmpSubject]).map(normalizeSubjectToken);
  return left.some((a) => right.some((b) => a === b));
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

  // Number-only RMP class tags are too ambiguous across departments.
  if (!parsed.subjects.length) return false;

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
