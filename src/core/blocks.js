// Professors the user chose to hide — stored locally only (chrome.storage.local).

import { normalizeName } from './matching.js';

export const BLOCKS_STORAGE_KEY = 'user-blocks';

/**
 * Stable id for a professor (school + normalized last/first).
 * @param {string} rawName  UniTime instructor text
 * @param {string} [school]
 */
export function professorKey(rawName, school = 'purdue') {
  const n = normalizeName(rawName);
  if (n.isPlaceholder || !n.last) return '';
  return `${school}:${n.last}:${n.first}`;
}

/**
 * @returns {Promise<Record<string, { rawName: string, blockedAt: number }>>}
 */
export async function getBlocksMap() {
  const stored = await chrome.storage.local.get(BLOCKS_STORAGE_KEY);
  return stored[BLOCKS_STORAGE_KEY]?.entries || {};
}

/**
 * @param {string} rawName
 * @returns {Promise<boolean>}
 */
export async function isBlocked(rawName) {
  const key = professorKey(rawName);
  if (!key) return false;
  const map = await getBlocksMap();
  return !!map[key];
}

/**
 * @param {string} rawName
 * @param {boolean} blocked
 */
export async function setBlocked(rawName, blocked) {
  const key = professorKey(rawName);
  if (!key) return;

  const stored = await chrome.storage.local.get(BLOCKS_STORAGE_KEY);
  const entries = { ...(stored[BLOCKS_STORAGE_KEY]?.entries || {}) };

  if (blocked) {
    entries[key] = { rawName, blockedAt: Date.now() };
  } else {
    delete entries[key];
  }

  await chrome.storage.local.set({ [BLOCKS_STORAGE_KEY]: { entries } });
}

/** @returns {Promise<Array<{ key: string, rawName: string, blockedAt: number }>>} */
export async function listBlocked() {
  const map = await getBlocksMap();
  return Object.entries(map).map(([key, v]) => ({ key, ...v }));
}
