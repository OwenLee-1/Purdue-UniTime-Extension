// AI-shorten RMP review comments (Chrome Summarizer / fallback).

import { sendToBackground } from '../shared/extensionMessaging.js';

export const AI_SUMMARIES_STORAGE_KEY = 'aiReviewSummaries';

/** @param {string} text */
export function fallbackShortenReview(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  if (t.length <= 160) return t;

  const slice = t.slice(0, 220);
  const breakAt = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? ')
  );
  if (breakAt > 80) return `${slice.slice(0, breakAt + 1).trim()}…`;
  return `${slice.slice(0, 160).trimEnd()}…`;
}

/**
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function shortenReviewComment(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  if (t.length <= 120) return t;

  const settings = await chrome.storage.local.get([AI_SUMMARIES_STORAGE_KEY]);
  if (settings[AI_SUMMARIES_STORAGE_KEY] === false) {
    return fallbackShortenReview(t);
  }

  const response = await sendToBackground({ type: 'SUMMARIZE_REVIEWS', texts: [t] });
  if (response?.ok && Array.isArray(response.summaries) && response.summaries[0]) {
    return response.summaries[0];
  }
  return fallbackShortenReview(t);
}

/**
 * @param {import('./providers/Provider.js').ReviewSnippet[]} reviews
 * @returns {Promise<string[]>}
 */
export async function shortenReviewBatch(reviews) {
  const texts = (reviews || []).map((r) => String(r.comment || '').trim()).filter(Boolean);
  if (!texts.length) return [];

  const settings = await chrome.storage.local.get([AI_SUMMARIES_STORAGE_KEY]);
  if (settings[AI_SUMMARIES_STORAGE_KEY] === false) {
    return texts.map(fallbackShortenReview);
  }

  const response = await sendToBackground({ type: 'SUMMARIZE_REVIEWS', texts });
  if (response?.ok && Array.isArray(response.summaries) && response.summaries.length === texts.length) {
    return response.summaries;
  }
  return texts.map(fallbackShortenReview);
}
