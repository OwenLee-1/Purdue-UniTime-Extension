// Singleton hover preview card — one glance popover at a time across all badges.

import { createPopover } from './Popover.js';

/** @type {{ card: HTMLElement | null, host: Element | null, hideTimer: ReturnType<typeof setTimeout> | null }} */
let state = { card: null, host: null, hideTimer: null };

/**
 * @param {HTMLElement} card
 * @param {Element} host
 */
function positionPreview(card, host) {
  const rect = host.getBoundingClientRect();
  const below = window.innerHeight - rect.bottom;
  const maxLeft = Math.max(8, Math.min(rect.left, window.innerWidth - card.offsetWidth - 8));
  card.style.left = `${maxLeft}px`;
  if (below < 280) {
    card.style.top = '';
    card.style.bottom = `${window.innerHeight - rect.top + 6}px`;
  } else {
    card.style.bottom = '';
    card.style.top = `${rect.bottom + 6}px`;
  }
}

function cancelHide() {
  if (state.hideTimer) {
    clearTimeout(state.hideTimer);
    state.hideTimer = null;
  }
}

export function scheduleHideHoverPreview() {
  cancelHide();
  state.hideTimer = setTimeout(hideHoverPreview, 160);
}

export function hideHoverPreview() {
  cancelHide();
  if (state.card) {
    state.card.remove();
    state.card = null;
    state.host = null;
  }
}

/**
 * @param {Element} host
 * @param {import('../../core/providers/Provider.js').ProviderResult} result
 */
export function showHoverPreview(host, result) {
  if (!result || result.status === 'loading' || result.status === 'staff_tba') return;

  const reopen = state.host === host && state.card;
  if (reopen) {
    hideHoverPreview();
  } else if (state.card) {
    hideHoverPreview();
  }

  const card = createPopover(result, { previewOnly: true });
  card.addEventListener('mouseenter', cancelHide);
  card.addEventListener('mouseleave', scheduleHideHoverPreview);
  document.body.appendChild(card);
  positionPreview(card, host);

  state.card = card;
  state.host = host;
}

/**
 * @param {Element} host
 * @param {import('../../core/providers/Provider.js').ProviderResult} result
 */
export function refreshHoverPreview(host, result) {
  if (state.host !== host || !state.card) return;
  const visible = state.card.isConnected;
  hideHoverPreview();
  if (visible) showHoverPreview(host, result);
}

export function isHoverPreviewOpenFor(host) {
  return state.host === host && !!state.card;
}
