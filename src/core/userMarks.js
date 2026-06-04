// Personal marks: like/dislike, "had this professor", and optional notes.
// Stored locally only — never sent to a server.

import { professorKey } from './blocks.js';

export const MARKS_STORAGE_KEY = 'user-marks';

/**
 * @typedef {Object} UserMark
 * @property {string} rawName
 * @property {'like'|'dislike'|null} [sentiment]
 * @property {boolean} [taken]
 * @property {string} [note]
 * @property {number} [updatedAt]
 */

/**
 * @param {string} rawName
 * @returns {Promise<UserMark | null>}
 */
export async function getMark(rawName) {
  const key = professorKey(rawName);
  if (!key) return null;
  const stored = await chrome.storage.local.get(MARKS_STORAGE_KEY);
  return stored[MARKS_STORAGE_KEY]?.entries?.[key] || null;
}

/**
 * Merge updates for a professor. Pass sentiment: null to clear like/dislike.
 * @param {string} rawName
 * @param {Partial<UserMark>} patch
 * @returns {Promise<UserMark | null>}
 */
export async function updateMark(rawName, patch) {
  const key = professorKey(rawName);
  if (!key) return null;

  const stored = await chrome.storage.local.get(MARKS_STORAGE_KEY);
  const entries = { ...(stored[MARKS_STORAGE_KEY]?.entries || {}) };
  const prev = entries[key] || { rawName };

  const next = {
    rawName,
    sentiment: patch.sentiment !== undefined ? patch.sentiment : prev.sentiment ?? null,
    taken: patch.taken !== undefined ? patch.taken : !!prev.taken,
    note: patch.note !== undefined ? String(patch.note).trim() : (prev.note || ''),
    updatedAt: Date.now(),
  };

  if (!next.sentiment && !next.taken && !next.note) {
    delete entries[key];
    await chrome.storage.local.set({ [MARKS_STORAGE_KEY]: { entries } });
    return null;
  }

  entries[key] = next;
  await chrome.storage.local.set({ [MARKS_STORAGE_KEY]: { entries } });
  return next;
}

/** @returns {Promise<UserMark[]>} */
export async function listMarks() {
  const stored = await chrome.storage.local.get(MARKS_STORAGE_KEY);
  const entries = stored[MARKS_STORAGE_KEY]?.entries || {};
  return Object.values(entries);
}
