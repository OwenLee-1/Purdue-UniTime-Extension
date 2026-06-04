// Offscreen document — browser-like fetch context when the service worker request fails.

import { RmpProvider } from '../core/providers/rmpProvider.js';

const rmpProvider = new RmpProvider();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'RMP_OFFSCREEN_LOOKUP') return undefined;

  rmpProvider
    .lookup(message.query || {})
    .then((result) => sendResponse({ ok: true, result }))
    .catch((err) => sendResponse({ ok: false, error: String(err) }));

  return true;
});
