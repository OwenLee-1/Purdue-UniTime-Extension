// Offscreen document — RMP fetch fallback + Chrome Summarizer for review previews.

import { RmpProvider } from '../core/providers/rmpProvider.js';

const rmpProvider = new RmpProvider();

/** @type {Promise<import('chrome').Summarizer | null> | null} */
let summarizerPromise = null;

/** @param {string} text */
function fallbackShorten(text) {
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

async function getSummarizer() {
  if (typeof Summarizer === 'undefined') return null;
  try {
    const availability = await Summarizer.availability();
    if (availability === 'unavailable') return null;
    if (!summarizerPromise) {
      summarizerPromise = Summarizer.create({
        type: 'tldr',
        format: 'plain-text',
        length: 'short',
      });
    }
    return summarizerPromise;
  } catch {
    return null;
  }
}

/**
 * @param {string} text
 * @returns {Promise<{ text: string, engine: string }>}
 */
async function summarizeOne(text) {
  const t = String(text || '').trim();
  if (!t) return { text: '', engine: 'fallback' };
  if (t.length <= 120) return { text: t, engine: 'unchanged' };

  const summarizer = await getSummarizer();
  if (!summarizer) return { text: fallbackShorten(t), engine: 'fallback' };

  try {
    const result = await summarizer.summarize(t);
    const out = String(result || '').trim();
    return { text: out || fallbackShorten(t), engine: 'summarizer' };
  } catch {
    return { text: fallbackShorten(t), engine: 'fallback' };
  }
}

/**
 * @param {string[]} texts
 */
async function summarizeBatch(texts) {
  const summaries = [];
  let engine = 'fallback';

  for (const text of texts) {
    const row = await summarizeOne(text);
    summaries.push(row.text);
    if (row.engine === 'summarizer') engine = 'summarizer';
  }

  return { ok: true, summaries, engine };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'RMP_OFFSCREEN_LOOKUP') {
    rmpProvider
      .lookup(message.query || {})
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message?.type === 'SUMMARIZE_REVIEWS_OFFSCREEN') {
    summarizeBatch(message.texts || [])
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  return undefined;
});
