// The little window shown when you click the extension's toolbar icon.
//
// Toggles are saved to chrome.storage.local. The content script reads them on
// load (Show ratings / Debug) and reacts live to the "hide schedule preview"
// setting via a storage change listener.

const enabledBox = document.getElementById('enabled');
const hideOverlayBox = document.getElementById('hideOverlay');
const debugBox = document.getElementById('debug');
const clearBtn = document.getElementById('clearCache');
const statusEl = document.getElementById('status');
const reportLink = document.getElementById('reportLink');

function setStatus(msg) {
  statusEl.textContent = msg;
  if (msg) setTimeout(() => (statusEl.textContent = ''), 2500);
}

// Load saved settings when the popup opens.
chrome.storage.local.get(['enabled', 'hideOverlay', 'debug']).then((s) => {
  enabledBox.checked = s.enabled !== false; // default ON
  hideOverlayBox.checked = s.hideOverlay === true; // default OFF
  debugBox.checked = s.debug === true; // default OFF
});

enabledBox.addEventListener('change', () => {
  chrome.storage.local.set({ enabled: enabledBox.checked });
  setStatus('Reload the UniTime tab to apply');
});

hideOverlayBox.addEventListener('change', () => {
  chrome.storage.local.set({ hideOverlay: hideOverlayBox.checked });
});

debugBox.addEventListener('change', () => {
  chrome.storage.local.set({ debug: debugBox.checked });
  setStatus('Reload the UniTime tab to apply');
});

// Remove every cached rating (keys are prefixed "rmp-cache:").
clearBtn.addEventListener('click', async () => {
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((k) => k.startsWith('rmp-cache:'));
  if (keys.length) await chrome.storage.local.remove(keys);
  setStatus(`Cleared ${keys.length} cached rating${keys.length === 1 ? '' : 's'}`);
});

// Prefill a basic report (no backend yet — opens an email draft).
reportLink.addEventListener('click', (e) => {
  e.preventDefault();
  const subject = encodeURIComponent('Purdue RMP — wrong professor match');
  const body = encodeURIComponent(
    'Course + section:\nInstructor shown in UniTime:\nWho it should be on RateMyProfessors:\n'
  );
  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
});
