// Physical freeze layer: a full-screen catcher sits above UniTime but below
// GWT popups and RMP UI. Capture-phase guards block UniTime from seeing
// background clicks while the sidebar/settings are open.

import { resolvePointerAt, elementAtPointer } from './pointerZone.js';

const POPUP_SELECTOR =
  '.gwt-PopupPanel, .gwt-DialogBox, .unitime-Dialog, [role="dialog"]';

const CAPTURE_EVENTS = ['mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup'];
const DISMISS_POINTER_TYPES = new Set(['pointerdown', 'mousedown']);
const RMP_DISMISS_SEL = '.rmp-panel-close, .rmp-settings-close';
const SWALLOW_TAIL_MS = 450;
const SWALLOW_ATTR = 'data-rmp-gesture-swallow-until';
const FREEZE_ATTR = 'data-rmp-freeze-active';

/** @type {Set<string>} */
const activeReasons = new Set();

/** @type {Map<string, () => void>} */
const dismissHandlers = new Map();

/** @type {HTMLElement | null} */
let catcher = null;

/** @type {number} */
let lastDismissAt = 0;

/** @type {number} */
let swallowUntil = 0;

/** @type {number | null} */
let swallowPointerId = null;

let captureGuardInstalled = false;

function syncSwallowAttr() {
  if (Date.now() < swallowUntil) {
    document.documentElement.setAttribute(SWALLOW_ATTR, String(swallowUntil));
  } else {
    document.documentElement.removeAttribute(SWALLOW_ATTR);
  }
}

function extendGestureSwallow(ms = SWALLOW_TAIL_MS) {
  swallowUntil = Math.max(swallowUntil, Date.now() + ms);
  syncSwallowAttr();
}

/**
 * @param {Event} [e]
 */
function startGestureSwallow(e) {
  if (e && 'pointerId' in e) swallowPointerId = /** @type {number} */ (e.pointerId);
  extendGestureSwallow();
}

function isSwallowingGesture(e) {
  if (Date.now() < swallowUntil) return true;
  if (
    swallowPointerId !== null &&
    e &&
    'pointerId' in e &&
    e.pointerId === swallowPointerId
  ) {
    return true;
  }
  return false;
}

function installCaptureGuard() {
  if (captureGuardInstalled) return;
  captureGuardInstalled = true;
  for (const type of CAPTURE_EVENTS) {
    document.addEventListener(type, onFreezeCapture, true);
    window.addEventListener(type, onFreezeCapture, true);
  }
  document.addEventListener(
    'pointerup',
    (e) => {
      if (swallowPointerId !== null && e.pointerId === swallowPointerId) {
        swallowPointerId = null;
        extendGestureSwallow();
      }
    },
    true
  );
  document.addEventListener(
    'pointercancel',
    (e) => {
      if (swallowPointerId !== null && e.pointerId === swallowPointerId) {
        swallowPointerId = null;
        extendGestureSwallow();
      }
    },
    true
  );
  document.addEventListener('keydown', onFreezeKeydown, true);
}

function runDismissHandlers() {
  const now = Date.now();
  if (now - lastDismissAt < 300) return;
  lastDismissAt = now;
  for (const handler of dismissHandlers.values()) {
    handler();
  }
}

/**
 * Defer closing RMP UI until after the current event finishes, and swallow follow-up
 * pointer/keyboard events so GWT does not treat them as outside clicks.
 * @param {() => void} fn
 * @param {Event} [e]
 */
export function scheduleProtectedDismiss(fn, e) {
  startGestureSwallow(e);
  if (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
  window.setTimeout(() => fn(), 0);
}

/** Swallow follow-up events after a click inside RMP UI (settings toggles, etc.). */
export function touchRmpGesture(e) {
  startGestureSwallow(e);
}

/**
 * Close RMP UI after the pointer gesture finishes so GWT never sees follow-up events.
 * @param {Event} e
 */
function scheduleDismissFromGesture(e) {
  scheduleProtectedDismiss(runDismissHandlers, e);
}

/** @param {KeyboardEvent} e */
function onFreezeKeydown(e) {
  if (e.key !== 'Escape') return;

  const frozen = activeReasons.size > 0;
  const swallowing = Date.now() < swallowUntil;
  if (!frozen && !swallowing) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  if (frozen) {
    scheduleProtectedDismiss(runDismissHandlers);
  }
}

/** @param {Event} e */
function onFreezeCapture(e) {
  const frozen = activeReasons.size > 0;
  const swallowing = isSwallowingGesture(e);
  if (!frozen && !swallowing) return;

  const x = 'clientX' in e ? e.clientX : NaN;
  const y = 'clientY' in e ? e.clientY : NaN;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;

  const hit = elementAtPointer(x, y);

  // ✕ close: always wins over swallow blocking (same path as backdrop dismiss).
  if (frozen && hit?.closest?.(RMP_DISMISS_SEL)) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (DISMISS_POINTER_TYPES.has(e.type)) {
      scheduleDismissFromGesture(e);
    }
    return;
  }

  // While swallowing, block follow-up events on RMP surfaces (not dismiss controls).
  if (
    swallowing &&
    hit?.closest?.('#rmp-page-settings-host, .rmp-professor-panel') &&
    !hit?.closest?.(RMP_DISMISS_SEL)
  ) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    return;
  }

  if (frozen) {
    if (
      hit?.closest?.('#rmp-page-settings-host, .rmp-settings-panel, .rmp-professor-panel') &&
      DISMISS_POINTER_TYPES.has(e.type)
    ) {
      startGestureSwallow(e);
    }
  }

  const resolved = resolvePointerAt(x, y, { keepUnitimePopups: true });
  if (resolved.action === 'allow') return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  if (frozen && (resolved.action === 'dismiss-sidebar' || resolved.action === 'block')) {
    scheduleDismissFromGesture(e);
  }
}

installCaptureGuard();

/**
 * Find the highest z-index among visible UniTime popups.
 */
export function measureTopPopupZ() {
  let top = 0;
  for (const el of document.querySelectorAll(POPUP_SELECTOR)) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    const z = Number.parseInt(getComputedStyle(el).zIndex, 10);
    if (Number.isFinite(z) && z > top) top = z;
  }
  return top;
}

/**
 * Catcher below popups; RMP UI above popups.
 */
export function getStackZIndex() {
  const popupZ = measureTopPopupZ();
  if (popupZ > 0) {
    return { catcherZ: popupZ - 1, uiZ: popupZ + 10, popupZ };
  }
  return { catcherZ: 100000, uiZ: 2147483647, popupZ: 0 };
}

/**
 * @param {HTMLElement} el
 */
export function applyUiLayerZ(el) {
  const { uiZ } = getStackZIndex();
  el.style.zIndex = String(uiZ);
  if (el.isConnected) document.body.appendChild(el);
}

function syncFreezeAttr() {
  if (activeReasons.size > 0) {
    document.documentElement.setAttribute(FREEZE_ATTR, '');
  } else {
    document.documentElement.removeAttribute(FREEZE_ATTR);
  }
}

function syncCatcher() {
  if (activeReasons.size === 0) {
    catcher?.remove();
    catcher = null;
    syncFreezeAttr();
    return;
  }

  if (!catcher) {
    catcher = document.createElement('div');
    catcher.id = 'rmp-freeze-catcher';
    catcher.className = 'rmp-sidebar-backdrop';
  }

  const { catcherZ } = getStackZIndex();
  Object.assign(catcher.style, {
    position: 'fixed',
    inset: '0',
    zIndex: String(catcherZ),
    background: 'rgba(0, 0, 0, 0.2)',
    pointerEvents: 'auto',
  });

  document.body.appendChild(catcher);
  syncFreezeAttr();
}

/**
 * @param {boolean} active
 * @param {{ reason: string, onOutsideClick?: () => void, dim?: boolean }} opts
 */
export function setBackgroundFreeze(active, opts) {
  if (active) {
    activeReasons.add(opts.reason);
    if (opts.onOutsideClick) dismissHandlers.set(opts.reason, opts.onOutsideClick);
  } else {
    activeReasons.delete(opts.reason);
    dismissHandlers.delete(opts.reason);
  }
  syncCatcher();
}

export function isBackgroundFrozen() {
  return activeReasons.size > 0;
}

export function getActiveFreezeReasons() {
  return [...activeReasons];
}

/** Re-stack catcher below popups and RMP UI above after DOM churn. */
export function restackFreezeLayers() {
  syncCatcher();
  for (const el of document.querySelectorAll(
    '.rmp-professor-panel, #rmp-page-settings-host'
  )) {
    applyUiLayerZ(/** @type {HTMLElement} */ (el));
  }
}
