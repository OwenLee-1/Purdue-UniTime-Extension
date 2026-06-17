// Hit-test the cursor against RMP UI layers and UniTime popups.
// Use with freezeController.js to decide when background clicks should be blocked.

import { getStackZIndex, measureTopPopupZ } from './freezeController.js';

/** @typedef {'none'|'settings'|'sidebar'|'sidebar-backdrop'|'hover-preview'|'badge'|'unitime-popup'|'unitime'} PointerZone */

export const POINTER_ZONE = {
  NONE: 'none',
  SETTINGS: 'settings',
  SIDEBAR: 'sidebar',
  SIDEBAR_BACKDROP: 'sidebar-backdrop',
  HOVER_PREVIEW: 'hover-preview',
  BADGE: 'badge',
  UNITIME_POPUP: 'unitime-popup',
  UNITIME: 'unitime',
};

const RMP_SELECTORS = {
  [POINTER_ZONE.SETTINGS]:
    '#rmp-page-settings-host, .rmp-settings-panel, .rmp-settings-fab, .rmp-settings-close, .rmp-settings-control',
  [POINTER_ZONE.SIDEBAR]: '.rmp-professor-panel, .rmp-professor-panel-frame, .rmp-panel-close',
  [POINTER_ZONE.SIDEBAR_BACKDROP]: '.rmp-sidebar-backdrop, #rmp-freeze-catcher',
  [POINTER_ZONE.HOVER_PREVIEW]: '.rmp-hover-preview',
  [POINTER_ZONE.BADGE]: '.rmp-badge-host',
};

const UNITIME_POPUP_SELECTOR =
  '.gwt-PopupPanel, .gwt-DialogBox, .unitime-Dialog, [role="dialog"]';

/** @type {{ x: number, y: number, zone: PointerZone, element: Element | null, ts: number } | null} */
let lastSample = null;

/**
 * @param {number} x
 * @param {number} y
 * @returns {Element | null}
 */
export function elementAtPointer(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return document.elementFromPoint(x, y);
}

/**
 * @param {Element | null | undefined} el
 * @returns {PointerZone}
 */
export function classifyElement(el) {
  if (!el || !(el instanceof Element)) return POINTER_ZONE.NONE;

  for (const [zone, selector] of Object.entries(RMP_SELECTORS)) {
    if (el.closest(selector)) return /** @type {PointerZone} */ (zone);
  }
  if (el.closest(UNITIME_POPUP_SELECTOR)) return POINTER_ZONE.UNITIME_POPUP;
  if (el.closest('body')) return POINTER_ZONE.UNITIME;
  return POINTER_ZONE.NONE;
}

/**
 * Full front-to-back stack at a pixel (topmost element first).
 * @param {number} x
 * @param {number} y
 * @returns {Array<{ zone: PointerZone, element: Element }>}
 */
export function getZoneStackAt(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
  return document.elementsFromPoint(x, y).map((element) => ({
    element,
    zone: classifyElement(element),
  }));
}

/** @typedef {'allow'|'block'|'dismiss-sidebar'} PointerAction */

/**
 * Resolve what should happen at a pixel. RMP controls win over the freeze catcher
 * when both appear in the hit stack at the same coordinates.
 * @param {number} x
 * @param {number} y
 * @param {{ keepUnitimePopups?: boolean }} [opts]
 * @returns {{ action: PointerAction, zone: PointerZone, element: Element | null, stack: Array<{ zone: PointerZone, element: Element }>, x: number, y: number }}
 */
const RMP_INTERACTIVE_ZONES = new Set([
  POINTER_ZONE.SETTINGS,
  POINTER_ZONE.SIDEBAR,
  POINTER_ZONE.HOVER_PREVIEW,
  POINTER_ZONE.BADGE,
]);

const RMP_DISMISS_SEL = '.rmp-panel-close, .rmp-settings-close';

export function resolvePointerAt(x, y, opts = { keepUnitimePopups: true }) {
  const stack = getZoneStackAt(x, y);
  const keepPopups = opts.keepUnitimePopups !== false;

  // ✕ buttons beat the freeze catcher; other RMP controls beat the catcher too.
  for (const { element, zone } of stack) {
    if (element instanceof Element && element.closest(RMP_DISMISS_SEL)) {
      const result = {
        action: /** @type {PointerAction} */ ('dismiss-sidebar'),
        zone,
        element,
        stack,
        x,
        y,
      };
      lastSample = { x, y, zone, element, ts: Date.now() };
      return result;
    }
    if (RMP_INTERACTIVE_ZONES.has(zone)) {
      const result = {
        action: /** @type {PointerAction} */ ('allow'),
        zone,
        element,
        stack,
        x,
        y,
      };
      lastSample = { x, y, zone, element, ts: Date.now() };
      return result;
    }
  }

  for (const { element, zone } of stack) {
    if (zone === POINTER_ZONE.SIDEBAR_BACKDROP) {
      const result = {
        action: /** @type {PointerAction} */ ('dismiss-sidebar'),
        zone,
        element,
        stack,
        x,
        y,
      };
      lastSample = { x, y, zone, element, ts: Date.now() };
      return result;
    }
    if (keepPopups && zone === POINTER_ZONE.UNITIME_POPUP) {
      const result = {
        action: /** @type {PointerAction} */ ('allow'),
        zone,
        element,
        stack,
        x,
        y,
      };
      lastSample = { x, y, zone, element, ts: Date.now() };
      return result;
    }
    if (zone === POINTER_ZONE.UNITIME) {
      const result = {
        action: /** @type {PointerAction} */ ('block'),
        zone,
        element,
        stack,
        x,
        y,
      };
      lastSample = { x, y, zone, element, ts: Date.now() };
      return result;
    }
  }

  const result = {
    action: /** @type {PointerAction} */ ('block'),
    zone: /** @type {PointerZone} */ (POINTER_ZONE.NONE),
    element: stack[0]?.element ?? null,
    stack,
    x,
    y,
  };
  lastSample = {
    x,
    y,
    zone: result.zone,
    element: result.element,
    ts: Date.now(),
  };
  return result;
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {{ zone: PointerZone, element: Element | null, x: number, y: number }}
 */
export function getZoneAt(x, y) {
  const { zone, element, x: px, y: py } = resolvePointerAt(x, y);
  return { zone, element, x: px, y: py };
}

/**
 * @param {PointerEvent | MouseEvent} e
 * @returns {{ zone: PointerZone, element: Element | null, x: number, y: number }}
 */
export function analyzePointerEvent(e) {
  return getZoneAt(e.clientX, e.clientY);
}

export function getLastPointerSample() {
  return lastSample;
}

/**
 * @param {PointerZone} zone
 */
export function isRmpMenuZone(zone) {
  return (
    zone === POINTER_ZONE.SETTINGS ||
    zone === POINTER_ZONE.SIDEBAR ||
    zone === POINTER_ZONE.HOVER_PREVIEW
  );
}

/**
 * Zones that stay interactive while the background is frozen.
 * @param {PointerZone} zone
 * @param {{ keepUnitimePopups?: boolean }} [opts]
 */
export function isFreezeExemptZone(zone, opts = {}) {
  if (
    zone === POINTER_ZONE.SETTINGS ||
    zone === POINTER_ZONE.SIDEBAR ||
    zone === POINTER_ZONE.HOVER_PREVIEW ||
    zone === POINTER_ZONE.BADGE ||
    zone === POINTER_ZONE.SIDEBAR_BACKDROP
  ) {
    return true;
  }
  if (opts.keepUnitimePopups && zone === POINTER_ZONE.UNITIME_POPUP) return true;
  return false;
}

/**
 * @returns {Record<PointerZone, DOMRect[]>}
 */
export function collectZoneRects() {
  /** @type {Record<string, DOMRect[]>} */
  const out = {};
  for (const zone of Object.values(POINTER_ZONE)) {
    out[zone] = [];
  }

  for (const [zone, selector] of Object.entries(RMP_SELECTORS)) {
    for (const el of document.querySelectorAll(selector)) {
      out[zone].push(el.getBoundingClientRect());
    }
  }
  for (const el of document.querySelectorAll(UNITIME_POPUP_SELECTOR)) {
    out[POINTER_ZONE.UNITIME_POPUP].push(el.getBoundingClientRect());
  }

  return /** @type {Record<PointerZone, DOMRect[]>} */ (out);
}

let debugEnabled = false;
/** @type {HTMLElement | null} */
let debugHud = null;
/** @type {((e: PointerEvent) => void) | null} */
let debugMoveListener = null;

function ensureDebugHud() {
  if (debugHud) return debugHud;
  debugHud = document.createElement('div');
  debugHud.id = 'rmp-pointer-zone-debug';
  Object.assign(debugHud.style, {
    position: 'fixed',
    top: '8px',
    left: '8px',
    zIndex: '2147483647',
    pointerEvents: 'none',
    background: 'rgba(0,0,0,0.82)',
    color: '#f9fafb',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '11px',
    lineHeight: '1.45',
    padding: '8px 10px',
    borderRadius: '8px',
    maxWidth: 'min(360px, 90vw)',
    whiteSpace: 'pre-wrap',
  });
  document.body.appendChild(debugHud);
  return debugHud;
}

/**
 * @param {PointerEvent} e
 */
function onDebugPointerMove(e) {
  if (!debugEnabled || !debugHud) return;
  const resolved = resolvePointerAt(e.clientX, e.clientY);
  const tag = resolved.element?.tagName?.toLowerCase() || 'null';
  const cls = resolved.element instanceof Element ? resolved.element.className : '';
  const stackPreview = resolved.stack
    .slice(0, 4)
    .map((s) => s.zone)
    .join(' → ');
  debugHud.textContent =
    `action: ${resolved.action}\n` +
    `zone: ${resolved.zone}\n` +
    `x/y: ${Math.round(resolved.x)}, ${Math.round(resolved.y)}\n` +
    `top: <${tag}${cls ? ` class="${String(cls).slice(0, 40)}"` : ''}>\n` +
    `stack: ${stackPreview}`;
}

/**
 * Toggle on-screen pointer zone HUD (also exposed on window.__rmpPointerZone).
 * @param {boolean} enabled
 */
export function setPointerZoneDebug(enabled) {
  debugEnabled = enabled;
  if (enabled) {
    ensureDebugHud();
    if (!debugMoveListener) {
      debugMoveListener = onDebugPointerMove;
      document.addEventListener('pointermove', debugMoveListener, true);
    }
    return;
  }
  if (debugMoveListener) {
    document.removeEventListener('pointermove', debugMoveListener, true);
    debugMoveListener = null;
  }
  debugHud?.remove();
  debugHud = null;
}

/** Attach console helpers for manual testing on UniTime. */
export function exposePointerZoneDebug() {
  const api = {
    POINTER_ZONE,
    getZoneAt,
    getZoneStackAt,
    resolvePointerAt,
    analyzePointerEvent,
    classifyElement,
    elementAtPointer,
    getLastPointerSample,
    isRmpMenuZone,
    isFreezeExemptZone,
    collectZoneRects,
    setPointerZoneDebug,
    getStackZIndex,
    measureTopPopupZ,
  };
  // @ts-expect-error debug hook
  window.__rmpPointerZone = api;
  return api;
}

exposePointerZoneDebug();
