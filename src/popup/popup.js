// The little window shown when you click the extension's toolbar icon.

import { listBlocked, setBlocked } from '../core/blocks.js';
import {
  ICAL_SOURCE_KEY,
  ICAL_STORAGE_KEY,
  normalizeIcalUrl,
} from '../core/icalUrl.js';
import { listMarks, updateMark } from '../core/userMarks.js';

function openExternalUrl(url) {
  if (/^webcal:/i.test(url)) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function initPopup() {
  const enabledBox = document.getElementById('enabled');
  const hideOverlayBox = document.getElementById('hideOverlay');
  const debugBox = document.getElementById('debug');
  const clearBtn = document.getElementById('clearCache');
  const statusEl = document.getElementById('status');
  const reportLink = document.getElementById('reportLink');
  const blockedListEl = document.getElementById('blockedList');
  const marksListEl = document.getElementById('marksList');
  const buildTagEl = document.getElementById('buildTag');
  const settingsLink = document.getElementById('settingsLink');
  const icalInput = document.getElementById('icalUrl');
  const addGoogleBtn = document.getElementById('addGoogle');
  const addAppleBtn = document.getElementById('addApple');
  const addOutlookBtn = document.getElementById('addOutlook');
  const calStatusEl = document.getElementById('calStatus');

  if (!enabledBox || !clearBtn || !statusEl) {
    console.error('[Purdue RMP] popup DOM not ready');
    return;
  }

  if (buildTagEl) buildTagEl.textContent = 'Build: 1.3.0-beta';

  if (settingsLink) {
    settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  async function renderBlockedList() {
    if (!blockedListEl) return;
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
    if (!marksListEl) return;
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
      const clearMarkBtn = document.createElement('button');
      clearMarkBtn.textContent = 'Clear';
      Object.assign(clearMarkBtn.style, { width: 'auto', padding: '3px 8px', fontSize: '10px' });
      clearMarkBtn.addEventListener('click', async () => {
        await updateMark(item.rawName, { sentiment: null, taken: false, note: '' });
        await renderMarksList();
        setStatus('Marks cleared');
      });
      top.append(name, clearMarkBtn);
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

  function formatIcalSource(source) {
    if (!source || source === 'manual') return '';
    if (source.includes('export')) return 'Auto-detected from UniTime export';
    if (source.includes('clipboard')) return 'Auto-detected from clipboard';
    if (source.includes('scan') || source.includes('dom')) return 'Auto-detected from UniTime';
    return 'Auto-detected from UniTime';
  }

  function refreshIcalUi(s) {
    if (icalInput && s[ICAL_STORAGE_KEY]) icalInput.value = s[ICAL_STORAGE_KEY];
    if (!calStatusEl) return;
    const source = s[ICAL_SOURCE_KEY];
    if (s[ICAL_STORAGE_KEY] && source && source !== 'manual') {
      calStatusEl.textContent = `✓ ${formatIcalSource(source)}`;
      calStatusEl.style.color = '#16a34a';
    }
  }

  chrome.storage.local
    .get(['enabled', 'hideOverlay', 'debug', ICAL_STORAGE_KEY, ICAL_SOURCE_KEY])
    .then((s) => {
      enabledBox.checked = s.enabled !== false;
      if (hideOverlayBox) hideOverlayBox.checked = s.hideOverlay === true;
      if (debugBox) debugBox.checked = s.debug === true;
      refreshIcalUi(s);
    });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[ICAL_STORAGE_KEY] || changes[ICAL_SOURCE_KEY]) {
      chrome.storage.local.get([ICAL_STORAGE_KEY, ICAL_SOURCE_KEY]).then(refreshIcalUi);
    }
  });

  enabledBox.addEventListener('change', () => {
    chrome.storage.local.set({ enabled: enabledBox.checked });
    setStatus('Reload the UniTime tab to apply');
  });

  if (hideOverlayBox) {
    hideOverlayBox.addEventListener('change', () => {
      chrome.storage.local.set({ hideOverlay: hideOverlayBox.checked });
    });
  }

  if (debugBox) {
    debugBox.addEventListener('change', () => {
      chrome.storage.local.set({ debug: debugBox.checked });
      setStatus('Reload the UniTime tab to apply');
    });
  }

  clearBtn.addEventListener('click', async () => {
    const all = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter((k) => k.startsWith('rmp-cache:'));
    if (keys.length) await chrome.storage.local.remove(keys);
    setStatus(`Cleared ${keys.length} cached rating${keys.length === 1 ? '' : 's'}`);
  });

  function persistIcalUrl() {
    if (!icalInput) return;
    const v = normalizeIcalUrl(icalInput.value);
    if (v) chrome.storage.local.set({ [ICAL_STORAGE_KEY]: v, [ICAL_SOURCE_KEY]: 'manual' });
  }

  if (icalInput) {
    icalInput.addEventListener('input', persistIcalUrl);
    icalInput.addEventListener('change', persistIcalUrl);
  }

  function readIcalUrl() {
    if (!icalInput) return null;
    const v = normalizeIcalUrl(icalInput.value);
    if (!/^(https?|webcal):\/\//i.test(v)) {
      if (calStatusEl) calStatusEl.textContent = 'Paste a valid UniTime iCal URL (https:// or webcal://).';
      return null;
    }
    if (!/mypurdue\.purdue\.edu|purdue\.edu/i.test(v)) {
      if (calStatusEl) {
        calStatusEl.textContent = 'Warning: this may not be a Purdue UniTime URL.';
      }
    } else if (calStatusEl) {
      calStatusEl.textContent = '';
    }
    persistIcalUrl();
    return v;
  }

  function toWebcal(url) {
    return url.replace(/^https?:\/\//i, 'webcal://');
  }

  if (addGoogleBtn) {
    addGoogleBtn.addEventListener('click', () => {
      const url = readIcalUrl();
      if (!url) return;
      setStatus('Opening Google Calendar…');
      openExternalUrl(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(toWebcal(url))}`);
    });
  }

  if (addAppleBtn) {
    addAppleBtn.addEventListener('click', () => {
      const url = readIcalUrl();
      if (!url) return;
      setStatus('Opening Apple Calendar…');
      openExternalUrl(toWebcal(url));
    });
  }

  if (addOutlookBtn) {
    addOutlookBtn.addEventListener('click', () => {
      const url = readIcalUrl();
      if (!url) return;
      setStatus('Opening Outlook…');
      openExternalUrl(
        `https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(toWebcal(url))}`
      );
    });
  }

  if (reportLink) {
    reportLink.addEventListener('click', (e) => {
      e.preventDefault();
      const subject = encodeURIComponent('Purdue RMP — wrong professor match');
      const body = encodeURIComponent(
        'Course + section:\nInstructor shown in UniTime:\nWho it should be on RateMyProfessors:\n'
      );
      openExternalUrl(`mailto:?subject=${subject}&body=${body}`);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPopup);
} else {
  initPopup();
}
