import {
  AI_SUMMARIES_STORAGE_KEY,
} from '../core/reviewSummarizer.js';
import {
  ICAL_DETECTED_AT_KEY,
  ICAL_SOURCE_KEY,
  ICAL_STORAGE_KEY,
} from '../core/icalUrl.js';

function initOptions() {
  const enabledBox = document.getElementById('enabled');
  const hideOverlayBox = document.getElementById('hideOverlay');
  const debugBox = document.getElementById('debug');
  const aiSummariesBox = document.getElementById('aiReviewSummaries');
  const clearBtn = document.getElementById('clearCache');
  const statusEl = document.getElementById('status');
  const icalStatusEl = document.getElementById('icalStatus');

  if (!enabledBox || !clearBtn) {
    console.error('[Purdue RMP] options DOM not ready');
    return;
  }

  function setStatus(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    if (msg) setTimeout(() => (statusEl.textContent = ''), 3000);
  }

  function refreshIcalStatus(s) {
    if (!icalStatusEl) return;
    const url = s[ICAL_STORAGE_KEY];
    if (!url) {
      icalStatusEl.textContent = 'No iCal URL yet. Export from UniTime or paste in the popup.';
      return;
    }
    const source = s[ICAL_SOURCE_KEY];
    const when = s[ICAL_DETECTED_AT_KEY];
    const whenText = when ? ` (${new Date(when).toLocaleString()})` : '';
    const sourceText =
      source && source !== 'manual' ? 'Auto-detected from UniTime' : 'Saved manually';
    icalStatusEl.textContent = `${sourceText}${whenText}`;
  }

  chrome.storage.local
    .get(['enabled', 'hideOverlay', 'debug', AI_SUMMARIES_STORAGE_KEY, ICAL_STORAGE_KEY, ICAL_SOURCE_KEY, ICAL_DETECTED_AT_KEY])
    .then((s) => {
      enabledBox.checked = s.enabled !== false;
      if (hideOverlayBox) hideOverlayBox.checked = s.hideOverlay === true;
      if (debugBox) debugBox.checked = s.debug === true;
      if (aiSummariesBox) aiSummariesBox.checked = s[AI_SUMMARIES_STORAGE_KEY] !== false;
      refreshIcalStatus(s);
    });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[ICAL_STORAGE_KEY] || changes[ICAL_SOURCE_KEY] || changes[ICAL_DETECTED_AT_KEY]) {
      chrome.storage.local
        .get([ICAL_STORAGE_KEY, ICAL_SOURCE_KEY, ICAL_DETECTED_AT_KEY])
        .then(refreshIcalStatus);
    }
  });

  for (const [el, key, reloadHint] of [
    [enabledBox, 'enabled', true],
    [hideOverlayBox, 'hideOverlay', false],
    [debugBox, 'debug', true],
    [aiSummariesBox, AI_SUMMARIES_STORAGE_KEY, false],
  ]) {
    if (!el) continue;
    el.addEventListener('change', () => {
      chrome.storage.local.set({ [key]: el.checked });
      if (reloadHint) setStatus('Reload your UniTime tab to apply.');
      else setStatus('Saved.');
    });
  }

  clearBtn.addEventListener('click', async () => {
    const all = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter((k) => k.startsWith('rmp-cache:'));
    if (keys.length) await chrome.storage.local.remove(keys);
    setStatus(`Cleared ${keys.length} cached rating${keys.length === 1 ? '' : 's'}.`);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOptions);
} else {
  initOptions();
}
