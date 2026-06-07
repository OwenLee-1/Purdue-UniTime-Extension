// Content script batches lookups; RMP network calls run in the background worker
// (page-context fetch is blocked on UniTime). GPA stays in the worker too.

import { lookupKey } from '../core/lookupKey.js';
import { professorKey } from '../core/blocks.js';
import { normalizeName } from '../core/matching.js';
import { mergeResults } from '../core/mergeResult.js';
import { sendToBackground, wakeBackground } from '../shared/extensionMessaging.js';

export const BUILD_TAG = '1.3.0-beta';

/** Merged results per professor+course (badge waiters). */
/** @type {Map<string, object>} */
const resultCache = new Map();

/** @type {Map<string, Array<(r: object) => void>>} */
const waitersByKey = new Map();

/** @type {Map<string, object>} */
const pendingQueries = new Map();

/** RMP hits keyed by professor (shared across course rows). */
/** @type {Map<string, object>} */
const rmpCacheByProfessor = new Map();

let batchTimer = null;
const BATCH_DEBOUNCE_MS = 200;

/** @type {Set<(pk: string, rmpRes: object) => void>} */
const professorRmpReadyHooks = new Set();

export { lookupKey as lookupQueryKey };

/**
 * @param {{ rawName: string, school?: string, course?: string }} query
 * @returns {boolean}
 */
export function hasWarmMergedCache(query) {
  const key = lookupKey(query);
  if (!key) return false;
  const cached = resultCache.get(key);
  return typeof cached?.overall === 'number';
}

/**
 * Fired when a professor's RMP result is cached in-page (duplicate rows can refresh).
 * @param {(pk: string, rmpRes: object) => void} hook
 * @returns {() => void}
 */
export function onProfessorRmpReady(hook) {
  professorRmpReadyHooks.add(hook);
  return () => professorRmpReadyHooks.delete(hook);
}

/**
 * @param {string} pk
 * @param {object} rmpRes
 */
function notifyProfessorRmpReady(pk, rmpRes) {
  for (const hook of professorRmpReadyHooks) {
    try {
      hook(pk, rmpRes);
    } catch (err) {
      console.warn('[Purdue RMP] professorRmpReady hook error:', err);
    }
  }
}

/**
 * @param {object} result
 */
function shouldCacheMergedResult(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status === 'fetch_failed') return false;
  return typeof result.overall === 'number';
}

/**
 * @param {object} result
 */
function shouldCacheRmpResult(result) {
  return result?.status === 'ok' && typeof result.overall === 'number';
}

function cloneResult(result) {
  return result && typeof result === 'object' ? { ...result } : result;
}

/**
 * @param {string} rawName
 * @param {object} rmpRes
 */
function storeRmpProfessorCache(rawName, rmpRes) {
  const copy = cloneResult(rmpRes);
  const pk = professorKey(rawName);
  if (pk) rmpCacheByProfessor.set(pk, copy);

  const detailName = rmpRes?.detail?.name;
  if (detailName) {
    const alias = professorKey(detailName);
    if (alias) rmpCacheByProfessor.set(alias, copy);
  }

  const legacyId = rmpRes?.detail?.profileUrl?.match(/professor\/(\d+)/)?.[1];
  if (legacyId) rmpCacheByProfessor.set(`legacy:${legacyId}`, copy);
}

/**
 * @param {string} rawName
 * @returns {object|undefined}
 */
function getRmpProfessorCache(rawName) {
  const pk = professorKey(rawName);
  if (pk) {
    const hit = rmpCacheByProfessor.get(pk);
    if (shouldCacheRmpResult(hit)) return hit;
  }

  const n = normalizeName(rawName);
  if (!n.last) return undefined;

  for (const [key, res] of rmpCacheByProfessor) {
    if (!shouldCacheRmpResult(res) || key.startsWith('legacy:')) continue;
    const parts = key.split(':');
    if (parts.length < 3 || parts[1] !== n.last) continue;
    const cachedFirst = parts[2] || '';
    if (!n.first || cachedFirst === n.first || cachedFirst[0] === n.first[0]) return res;
  }
  return undefined;
}

function deliverToWaiters(key, result) {
  const out = cloneResult(result);
  if (shouldCacheMergedResult(out)) resultCache.set(key, out);
  const list = waitersByKey.get(key) || [];
  waitersByKey.delete(key);
  for (const fn of list) fn(out);
}

/**
 * @param {object[]} queries  Unique professor queries (one per professorKey)
 */
async function fetchRmpBatchBackground(queries) {
  const awake = await wakeBackground();
  if (!awake) {
    console.warn('[Purdue RMP] background worker did not respond to PING');
  }

  const response = await sendToBackground({ type: 'LOOKUP_RMP_BATCH', queries });
  if (!response.ok) {
    console.warn('[Purdue RMP] RMP batch failed:', response.error);
    return {};
  }
  return response.results || {};
}

/**
 * GPA lookup via background worker (bundled grades data).
 * @param {object[]} queries
 */
async function fetchGradesBatch(queries) {
  const response = await sendToBackground({ type: 'LOOKUP_GRADES_BATCH', queries });
  if (!response.ok) return {};
  return response.results || {};
}

/**
 * @param {object} query
 * @param {(result: object) => void} onResult
 */
export function queueLookup(query, onResult) {
  const key = lookupKey(query);
  if (!key) {
    onResult({ status: 'no_match' });
    return;
  }

  const cached = resultCache.get(key);
  if (cached) {
    onResult(cloneResult(cached));
    return;
  }

  const list = waitersByKey.get(key) || [];
  list.push(onResult);
  waitersByKey.set(key, list);
  pendingQueries.set(key, query);

  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = setTimeout(flushBatch, BATCH_DEBOUNCE_MS);
}

/**
 * @param {object[]} queries
 * @returns {object[]}
 */
function professorsNeedingRmpFetch(queries) {
  const out = [];
  for (const q of dedupeQueriesByProfessor(queries)) {
    const pk = professorKey(q.rawName);
    if (!pk) continue;
    if (getRmpProfessorCache(q.rawName)) continue;
    out.push(q);
  }
  return out;
}

async function flushBatch() {
  batchTimer = null;
  if (!pendingQueries.size) return;

  const keys = [...pendingQueries.keys()];
  const queries = keys.map((k) => pendingQueries.get(k));
  pendingQueries.clear();

  const needRmp = professorsNeedingRmpFetch(queries);
  const [gradesByKey, rmpBatch] = await Promise.all([
    fetchGradesBatch(queries),
    needRmp.length ? fetchRmpBatchBackground(needRmp) : Promise.resolve({}),
  ]);

  /** @type {Array<{ pk: string, rmpRes: object }>} */
  const newlyCachedProfessors = [];

  for (const [pk, rmpRes] of Object.entries(rmpBatch)) {
    if (shouldCacheRmpResult(rmpRes)) {
      const queryForPk = queries.find((q) => professorKey(q.rawName) === pk);
      storeRmpProfessorCache(queryForPk?.rawName || '', rmpRes);
      newlyCachedProfessors.push({ pk, rmpRes: cloneResult(rmpRes) });
    }
  }

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const query = queries[i];
    try {
      const pk = professorKey(query.rawName);
      const rmpRes =
        getRmpProfessorCache(query.rawName) ||
        (pk && rmpBatch[pk]) ||
        { source: 'rmp', status: 'fetch_failed', confidence: 0, rmpFetchedIn: 'none' };
      const gradesRes = gradesByKey[key] || { status: 'no_match' };
      const merged = mergeResults(rmpRes, gradesRes, query.course);
      deliverToWaiters(key, merged);
    } catch (err) {
      console.warn('[Purdue RMP] lookup failed for', key, err);
      deliverToWaiters(key, { status: 'fetch_failed' });
    }
  }

  for (const { pk, rmpRes } of newlyCachedProfessors) {
    notifyProfessorRmpReady(pk, rmpRes);
  }
}

/**
 * @param {object[]} queries
 * @returns {object[]}
 */
function dedupeQueriesByProfessor(queries) {
  const seen = new Set();
  const out = [];
  for (const q of queries) {
    const pk = professorKey(q.rawName);
    if (!pk || seen.has(pk)) continue;
    seen.add(pk);
    out.push(q);
  }
  return out;
}

export function clearLookupCache() {
  resultCache.clear();
  waitersByKey.clear();
  pendingQueries.clear();
  rmpCacheByProfessor.clear();
  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = null;
}

/**
 * @param {Record<string, import('chrome').storage.StorageChange>} changes
 */
export function maybeClearLookupCacheFromStorage(changes) {
  if (Object.keys(changes).some((k) => k.startsWith('rmp-cache:'))) {
    resultCache.clear();
    rmpCacheByProfessor.clear();
  }
}
