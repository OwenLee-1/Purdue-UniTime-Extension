// UniTime on-page quick settings (bottom-right) + schedule-preview hiding.
//
// The floating menu replaces the old single "hide schedule preview" pill so testers
// can reach common toggles without opening the toolbar popup.

import { AI_SUMMARIES_STORAGE_KEY } from '../core/reviewSummarizer.js';
import { openExtensionOptionsPage } from '../shared/extensionMessaging.js';
import { setBackgroundFreeze, applyUiLayerZ } from './ui/freezeController.js';
import { bringRmpLayersToFront } from './ui/unitimeBackdrop.js';

export const OVERLAY_SELECTOR = '.unitime-SuggestionsHint, .unitime-SuggestionsHintWidget';

const HIDE_OVERLAY_KEY = 'hideOverlay';
const ENABLED_KEY = 'enabled';

let styleEl = null;
/** @type {(() => void) | null} */
let syncMenuFromStorage = null;

/**
 * @param {boolean} hide
 */
export function applyOverlayHiding(hide) {
  if (hide) {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.id = 'rmp-overlay-hide';
    styleEl.textContent = `${OVERLAY_SELECTOR} { display: none !important; }`;
    document.documentElement.appendChild(styleEl);
  } else if (styleEl) {
    styleEl.remove();
    styleEl = null;
  }
}

/**
 * @param {ParentNode} root
 * @param {string} label
 * @param {string} hint
 * @param {string} storageKey
 * @param {{ reloadHint?: boolean }} [opts]
 */
function mountToggleRow(root, label, hint, storageKey, opts = {}) {
  const row = document.createElement('label');
  Object.assign(row.style, {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '8px 0',
    borderBottom: '1px solid #374151',
    cursor: 'pointer',
  });

  const text = document.createElement('div');
  text.style.flex = '1';
  const title = document.createElement('div');
  title.textContent = label;
  Object.assign(title.style, { fontSize: '12px', fontWeight: '600', color: '#f9fafb' });
  text.appendChild(title);
  if (hint) {
    const sub = document.createElement('div');
    sub.textContent = hint;
    Object.assign(sub.style, { fontSize: '10px', color: '#9ca3af', marginTop: '2px', lineHeight: '1.35' });
    text.appendChild(sub);
  }

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.dataset.storageKey = storageKey;
  if (opts.reloadHint) box.dataset.reloadHint = '1';
  box.style.marginTop = '2px';
  box.style.flexShrink = '0';

  box.addEventListener('click', (e) => e.stopPropagation());
  box.addEventListener('change', async () => {
    await chrome.storage.local.set({ [storageKey]: box.checked });
  });

  row.append(text, box);
  root.appendChild(row);
  return box;
}

function mountSettingsMenu(initial) {
  const wrap = document.createElement('div');
  wrap.id = 'rmp-page-settings-host';
  Object.assign(wrap.style, {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    display: 'flex',
    flexDirection: 'column-reverse',
    alignItems: 'flex-end',
    gap: '8px',
    fontFamily: 'system-ui, sans-serif',
    pointerEvents: 'auto',
  });

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    display: 'none',
    width: 'min(280px, calc(100vw - 32px))',
    boxSizing: 'border-box',
    background: '#111827',
    color: '#f9fafb',
    borderRadius: '12px',
    boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
    padding: '12px 14px',
    border: '1px solid #374151',
  });

  const header = document.createElement('div');
  Object.assign(header.style, { marginBottom: '4px' });
  const heading = document.createElement('div');
  heading.textContent = 'Purdue RMP';
  Object.assign(heading.style, { fontWeight: '700', fontSize: '13px' });
  header.appendChild(heading);
  panel.appendChild(header);

  const sub = document.createElement('div');
  sub.textContent = 'Quick settings';
  Object.assign(sub.style, { fontSize: '10px', color: '#9ca3af', marginBottom: '6px' });
  panel.appendChild(sub);

  const toggles = document.createElement('div');
  const hideBox = mountToggleRow(
    toggles,
    'Hide schedule preview',
    'UniTime weekly grid on class hover',
    HIDE_OVERLAY_KEY
  );
  const enabledBox = mountToggleRow(
    toggles,
    'Show ratings',
    'Reload UniTime after changing',
    ENABLED_KEY,
    { reloadHint: true }
  );
  const aiBox = mountToggleRow(
    toggles,
    'AI-shorten reviews',
    'Hover preview and side panel',
    AI_SUMMARIES_STORAGE_KEY
  );
  panel.appendChild(toggles);

  const note = document.createElement('div');
  note.hidden = true;
  Object.assign(note.style, {
    fontSize: '10px',
    color: '#fbbf24',
    marginTop: '8px',
    lineHeight: '1.35',
  });
  note.textContent = 'Reload UniTime to apply the ratings toggle.';
  panel.appendChild(note);

  const fullBtn = document.createElement('button');
  fullBtn.type = 'button';
  fullBtn.textContent = 'Open full settings →';
  Object.assign(fullBtn.style, {
    width: '100%',
    marginTop: '10px',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #4b5563',
    background: '#1f2937',
    color: '#93c5fd',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  });
  fullBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openExtensionOptionsPage();
    setOpen(false);
  });
  panel.appendChild(fullBtn);

  const fab = document.createElement('button');
  fab.type = 'button';
  Object.assign(fab.style, {
    padding: '8px 14px',
    borderRadius: '9999px',
    border: 'none',
    background: '#111827',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    opacity: '0.92',
  });

  let menuOpen = false;

  function syncFreeze() {
    setBackgroundFreeze(menuOpen, {
      reason: 'settings',
      onOutsideClick: dismissAll,
    });
  }

  function dismissAll() {
    menuOpen = false;
    panel.style.display = 'none';
    fab.textContent = '⚙ Settings';
    fab.setAttribute('aria-expanded', 'false');
    syncFreeze();
  }

  function setOpen(open) {
    menuOpen = open;
    panel.style.display = open ? 'block' : 'none';
    fab.textContent = open ? '✕ Close' : '⚙ Settings';
    fab.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) applyUiLayerZ(wrap);
    syncFreeze();
  }

  function applyValues(s) {
    hideBox.checked = s[HIDE_OVERLAY_KEY] === true;
    enabledBox.checked = s[ENABLED_KEY] !== false;
    aiBox.checked = s[AI_SUMMARIES_STORAGE_KEY] !== false;
  }

  syncMenuFromStorage = () => {
    chrome.storage.local
      .get([HIDE_OVERLAY_KEY, ENABLED_KEY, AI_SUMMARIES_STORAGE_KEY])
      .then(applyValues);
  };

  applyValues(initial);

  setOpen(false);

  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menuOpen) dismissAll();
    else setOpen(true);
  });

  enabledBox.addEventListener('change', () => {
    note.hidden = false;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) dismissAll();
  });

  wrap.append(panel, fab);
  document.body.appendChild(wrap);
  bringRmpLayersToFront();
}

/**
 * Initialize schedule-preview hiding and the on-page settings menu.
 */
export async function initOverlayControl() {
  const stored = await chrome.storage.local.get([
    HIDE_OVERLAY_KEY,
    ENABLED_KEY,
    AI_SUMMARIES_STORAGE_KEY,
  ]);

  applyOverlayHiding(stored[HIDE_OVERLAY_KEY] === true);
  mountSettingsMenu(stored);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes[HIDE_OVERLAY_KEY]) {
      applyOverlayHiding(changes[HIDE_OVERLAY_KEY].newValue === true);
    }

    if (
      changes[HIDE_OVERLAY_KEY] ||
      changes[ENABLED_KEY] ||
      changes[AI_SUMMARIES_STORAGE_KEY]
    ) {
      syncMenuFromStorage?.();
    }
  });
}
