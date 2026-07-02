// Physical freeze layer: a full-screen catcher sits above UniTime but below
// GWT popups and RMP UI. Capture-phase guards block UniTime from seeing
// background clicks while the sidebar/settings are open.

import { resolvePointerAt, POINTER_ZONE } from './pointerZone.js';

const POPUP_SELECTOR =
  '.gwt-PopupPanel, .gwt-DialogBox, .unitime-Dialog, [role="dialog"]';

const CAPTURE_EVENTS = ['mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup'];
const DISMISS_POINTER_TYPES = new Set(['pointerdown', 'mousedown']);
const RMP_DISMISS_SEL = '.rmp-panel-close, .rmp-settings-close';
const RMP_SHIELD_SEL = `${RMP_DISMISS_SEL}, .rmp-settings-control`;
const RMP_INTERIOR_ZONES = new Set([POINTER_ZONE.SETTINGS, POINTER_ZONE.SIDEBAR]);
const SWALLOW_TAIL_MS = 450;
const SWALLOW_ATTR = 'data-rmp-gesture-swallow-until';
const FREEZE_ATTR = 'data-rmp-freeze-active';
const FREEZE_POPUPS_ATTR = 'data-rmp-freeze-popups';
const SETTINGS_TOP_Z = 2147483647;
const SETTINGS_CATCHER_Z = 2147483646;

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

/** @type {{ element: Element | null, at: number }} */
let lastShieldPress = { element: null, at: 0 };

/** @type {WeakMap<Element, () => void>} */
const shieldActions = new WeakMap();

/**
 * Same gesture shield as the professor-panel ✕: capture pointerdown, swallow
 * the follow-up events, and run the action after GWT's outside-click pass.
 * @param {HTMLElement} el
 * @param {() => void} [action]
 */
export function wireProtectedControl(el, action) {
  el.classList.add('rmp-settings-control');
  if (action) shieldActions.set(el, action);
}

function runShieldAction(el) {
  shieldActions.get(el)?.();
}

function shouldRunShieldAction(el, e) {
  if (!DISMISS_POINTER_TYPES.has(e.type)) return false;

  const now = Date.now();
  if (
    e.type === 'mousedown' &&
    lastShieldPress.element === el &&
    now - lastShieldPress.at < 80
  ) {
    return false;
  }

  lastShieldPress = { element: el, at: now };
  return true;
}

function syncSwallowAttr() {
  if (Date.now() < swallowUntil) {
    document.documentElement.setAttribute(SWALLOW_ATTR, String(swallowUntil));
  } else {
    document.documentElement.removeAttribute(SWALLOW_ATTR);
  }
}

function clearGestureSwallow() {
  swallowUntil = 0;
  swallowPointerId = null;
  syncSwallowAttr();
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
 * Defer work until after the current event finishes, and swallow follow-up
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

  // Settings is a small corner panel — freeze UniTime popups too so GWT cannot
  // receive outside-click dismiss while toggling options.
  const keepPopups = !activeReasons.has('settings');
  const resolved = resolvePointerAt(x, y, { keepUnitimePopups: keepPopups });
  const shieldControl = resolved.stack
    .map(({ element }) =>
      element instanceof Element ? element.closest(RMP_SHIELD_SEL) : null
    )
    .find(Boolean);

  if (frozen && shieldControl instanceof Element) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (shouldRunShieldAction(shieldControl, e)) {
      if (shieldControl.matches(RMP_DISMISS_SEL)) {
        scheduleDismissFromGesture(e);
      } else {
        scheduleProtectedDismiss(() => runShieldAction(shieldControl), e);
      }
    }
    return;
  }

  if (swallowing && resolved.action === 'block') {
    e.stopPropagation();
    e.stopImmediatePropagation();
    return;
  }

  if (
    frozen &&
    resolved.action === 'allow' &&
    RMP_INTERIOR_ZONES.has(resolved.zone) &&
    DISMISS_POINTER_TYPES.has(e.type)
  ) {
    startGestureSwallow(e);
  }

  if (resolved.action === 'allow') return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  if (frozen && resolved.action === 'dismiss-sidebar') {
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
  // Settings is a small corner panel — sit the catcher above every UniTime layer
  // (including GWT popups) so toggles cannot leak clicks to the page behind.
  if (activeReasons.has('settings')) {
    return { catcherZ: SETTINGS_CATCHER_Z, uiZ: SETTINGS_TOP_Z, popupZ };
  }
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
  if (activeReasons.has('settings')) {
    document.documentElement.setAttribute(FREEZE_POPUPS_ATTR, '');
  } else {
    document.documentElement.removeAttribute(FREEZE_POPUPS_ATTR);
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

  const settingsFreeze = activeReasons.has('settings');
  const { catcherZ } = getStackZIndex();
  Object.assign(catcher.style, {
    position: 'fixed',
    inset: '0',
    zIndex: String(catcherZ),
    background: settingsFreeze ? 'transparent' : 'rgba(0, 0, 0, 0.2)',
    pointerEvents: 'auto',
  });

  document.body.appendChild(catcher);
  syncFreezeAttr();
  for (const el of document.querySelectorAll(
    '.rmp-professor-panel, #rmp-page-settings-host'
  )) {
    applyUiLayerZ(/** @type {HTMLElement} */ (el));
  }
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
  if (!active && activeReasons.size === 0) {
    window.setTimeout(() => {
      if (activeReasons.size === 0) clearGestureSwallow();
    }, SWALLOW_TAIL_MS);
  }
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
