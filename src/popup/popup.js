// The little window shown when you click the extension's toolbar icon.

import { listBlocked, setBlocked } from '../core/blocks.js';
import { listMarks, updateMark } from '../core/userMarks.js';
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
const blockedListEl = document.getElementById('blockedList');
const marksListEl = document.getElementById('marksList');
const buildTagEl = document.getElementById('buildTag');

if (buildTagEl) buildTagEl.textContent = 'Build: 1.1.0-beta';

async function renderBlockedList() {
  const list = await listBlocked();
  blockedListEl.innerHTML = '';
  if (!list.length) {
    blockedListEl.textContent = 'None';
    return;
  }
  for (const item of list) {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '8px',
      margin: '4px 0',
      fontSize: '12px',
    });
    const name = document.createElement('span');
    name.textContent = item.rawName;
    name.style.flex = '1';
    const btn = document.createElement('button');
    btn.textContent = 'Unhide';
    Object.assign(btn.style, { width: 'auto', padding: '4px 8px', fontSize: '11px' });
    btn.addEventListener('click', async () => {
      await setBlocked(item.rawName, false);
      await renderBlockedList();
      setStatus('Section unhidden on UniTime');
    });
    row.append(name, btn);
    blockedListEl.appendChild(row);
  }
}

renderBlockedList();

async function renderMarksList() {
  const list = await listMarks();
  marksListEl.innerHTML = '';
  if (!list.length) {
    marksListEl.textContent = 'None';
    return;
  }
  for (const item of list) {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      margin: '6px 0',
      fontSize: '12px',
      padding: '6px 0',
      borderBottom: '1px solid #e5e7eb',
    });
    const top = document.createElement('div');
    Object.assign(top.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
    const name = document.createElement('span');
    const tags = [];
    if (item.sentiment === 'like') tags.push('👍');
    if (item.sentiment === 'dislike') tags.push('👎');
    if (item.taken) tags.push('had before');
    name.textContent = `${item.rawName}${tags.length ? ` (${tags.join(', ')})` : ''}`;
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    Object.assign(clearBtn.style, { width: 'auto', padding: '3px 8px', fontSize: '10px' });
    clearBtn.addEventListener('click', async () => {
      await updateMark(item.rawName, { sentiment: null, taken: false, note: '' });
      await renderMarksList();
      setStatus('Marks cleared');
    });
    top.append(name, clearBtn);
    row.appendChild(top);
    if (item.note) {
      const note = document.createElement('div');
      note.textContent = item.note;
      Object.assign(note.style, { color: '#6b7280', fontSize: '10px' });
      row.appendChild(note);
    }
    marksListEl.appendChild(row);
  }
}

renderMarksList();

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

// --- Calendar export helper ---
// UniTime gives each student a personal, login-protected iCalendar URL. We can't
// generate it for them, but once they paste it we turn it into one-click
// "subscribe" links for Google and Apple/Outlook (which both accept webcal://).
const icalInput = document.getElementById('icalUrl');
const addGoogleBtn = document.getElementById('addGoogle');
const addAppleBtn = document.getElementById('addApple');
const calStatusEl = document.getElementById('calStatus');

chrome.storage.local.get(['icalUrl']).then((s) => {
  if (s.icalUrl) icalInput.value = s.icalUrl;
});

icalInput.addEventListener('change', () => {
  chrome.storage.local.set({ icalUrl: icalInput.value.trim() });
});

function readIcalUrl() {
  const v = icalInput.value.trim();
  if (!/^(https?|webcal):\/\//i.test(v)) {
    calStatusEl.textContent = 'Paste your UniTime iCal URL first.';
    return null;
  }
  calStatusEl.textContent = '';
  return v;
}

function toWebcal(url) {
  return url.replace(/^https?:\/\//i, 'webcal://');
}

addGoogleBtn.addEventListener('click', () => {
  const url = readIcalUrl();
  if (!url) return;
  window.open(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(toWebcal(url))}`, '_blank');
});

addAppleBtn.addEventListener('click', () => {
  const url = readIcalUrl();
  if (!url) return;
  // webcal:// hands off to the OS calendar app (Apple Calendar, Outlook, etc.).
  window.open(toWebcal(url), '_blank');
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
