// Singleton hover preview card — one glance popover at a time across all badges.

import { createPopover } from './Popover.js';
/** @type {{ card: HTMLElement | null, host: Element | null, hideTimer: ReturnType<typeof setTimeout> | null }} */
let state = { card: null, host: null, hideTimer: null };

const VIEWPORT_MARGIN = 8;
const BADGE_GAP = 6;
const MIN_PREVIEW_HEIGHT = 120;

/**
 * Keep the hover card inside the viewport — use all space to the bottom (or top) edge.
 * @param {HTMLElement} card
 * @param {Element} host
 */
function positionPreview(card, host) {
  const rect = host.getBoundingClientRect();
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;

  const cardW = card.offsetWidth;
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(rect.left, viewportW - cardW - VIEWPORT_MARGIN)
  );
  card.style.left = `${left}px`;

  const spaceBelow = viewportH - rect.bottom - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - VIEWPORT_MARGIN;
  const placeBelow = spaceBelow >= MIN_PREVIEW_HEIGHT || spaceBelow >= spaceAbove;

  card.style.top = '';
  card.style.bottom = '';

  if (placeBelow) {
    const maxHeight = Math.max(
      MIN_PREVIEW_HEIGHT,
      Math.min(viewportH * 0.7, spaceBelow - BADGE_GAP)
    );
    card.style.maxHeight = `${maxHeight}px`;
    card.style.top = `${rect.bottom + BADGE_GAP}px`;
  } else {
    const maxHeight = Math.max(
      MIN_PREVIEW_HEIGHT,
      Math.min(viewportH * 0.7, spaceAbove - BADGE_GAP)
    );
    card.style.maxHeight = `${maxHeight}px`;
    card.style.bottom = `${viewportH - rect.top + BADGE_GAP}px`;
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
