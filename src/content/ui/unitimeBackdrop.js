// Stop pointer events on RMP backdrops from reaching UniTime (GWT) underneath.

import { restackFreezeLayers } from './freezeController.js';

// Layering (low → high): UniTime page → UniTime popups → RMP freeze catcher → RMP UI.

export const RMP_BACKDROP_Z = 500000;
export const RMP_UI_Z = 2147483647;

/**
 * @param {Event} e
 */
export function stopUniTimeLeak(e) {
  e.preventDefault();
  e.stopPropagation();
}

/** Keep RMP floating UI above UniTime after DOM churn. */
export function bringRmpLayersToFront() {
  restackFreezeLayers();
}

/**
 * @param {{ dim?: boolean, className?: string }} [opts]
 * @returns {HTMLDivElement}
 */
export function createUniTimeBackdrop(opts = {}) {
  const backdrop = document.createElement('div');
  if (opts.className) backdrop.className = opts.className;
  Object.assign(backdrop.style, {
    position: 'fixed',
    inset: '0',
    zIndex: String(RMP_BACKDROP_Z),
    background: opts.dim ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.1)',
    pointerEvents: 'auto',
  });
  return backdrop;
}

/**
 * Stop events on a control from bubbling to UniTime (bubble phase only so
 * child handlers still run).
 * @param {HTMLElement} el
 */
export function guardCloseControl(el) {
  for (const type of ['mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup']) {
    el.addEventListener(type, (e) => e.stopPropagation(), false);
  }
}
