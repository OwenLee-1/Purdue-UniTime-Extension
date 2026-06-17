// Singleton hover preview card — one glance popover at a time across all badges.

import { createPopover } from './Popover.js';
/** @type {{ card: HTMLElement | null, host: Element | null, hideTimer: ReturnType<typeof setTimeout> | null }} */
let state = { card: null, host: null, hideTimer: null };

const VIEWPORT_MARGIN = 8;
const BADGE_GAP = 6;

/** @type {(() => void) | null} */
let detachReposition = null;

function getViewport() {
  const vv = window.visualViewport;
  if (!vv) {
    return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
  }
  return { top: vv.offsetTop, left: vv.offsetLeft, width: vv.width, height: vv.height };
}

/**
 * @param {HTMLElement} card
 */
function measureCard(card) {
  const saved = {
    top: card.style.top,
    bottom: card.style.bottom,
    left: card.style.left,
    maxHeight: card.style.maxHeight,
    overflow: card.style.overflow,
    visibility: card.style.visibility,
  };

  card.style.maxHeight = 'none';
  card.style.overflow = 'visible';
  card.style.top = '0';
  card.style.bottom = '';
  card.style.left = '0';
  card.style.visibility = 'hidden';

  const size = { width: card.offsetWidth, height: card.scrollHeight };

  card.style.visibility = '';
  card.style.top = saved.top;
  card.style.bottom = saved.bottom;
  card.style.left = saved.left;
  card.style.maxHeight = saved.maxHeight;
  card.style.overflow = saved.overflow;

  return size;
}

/**
 * Slide the full card within the viewport — never clip with an internal scrollbar.
 * @param {HTMLElement} card
 * @param {Element} host
 */
function positionPreview(card, host) {
  const rect = host.getBoundingClientRect();
  const vp = getViewport();
  const vpTop = vp.top + VIEWPORT_MARGIN;
  const vpBottom = vp.top + vp.height - VIEWPORT_MARGIN;
  const vpLeft = vp.left + VIEWPORT_MARGIN;
  const vpRight = vp.left + vp.width - VIEWPORT_MARGIN;

  const maxCardW = Math.min(290, vp.width - VIEWPORT_MARGIN * 2);
  const minCardW = Math.min(200, maxCardW);
  card.style.maxWidth = `${maxCardW}px`;
  card.style.minWidth = `${minCardW}px`;
  card.style.maxHeight = 'none';
  card.style.overflow = 'visible';
  card.style.bottom = '';

  const { width: cardW, height: cardH } = measureCard(card);
  const left = Math.max(vpLeft, Math.min(rect.left, vpRight - cardW));
  card.style.left = `${left}px`;

  let top = rect.bottom + BADGE_GAP;
  if (top + cardH > vpBottom) top = vpBottom - cardH;
  if (top < vpTop) top = vpTop;

  card.style.top = `${top}px`;
}

function repositionPreview() {
  if (state.card && state.host) positionPreview(state.card, state.host);
}

function attachRepositionListeners() {
  detachRepositionListeners();

  const onReflow = () => repositionPreview();
  window.addEventListener('resize', onReflow, { passive: true });
  window.addEventListener('scroll', onReflow, { passive: true, capture: true });
  window.visualViewport?.addEventListener('resize', onReflow, { passive: true });
  window.visualViewport?.addEventListener('scroll', onReflow, { passive: true });

  /** @type {ResizeObserver | null} */
  let resizeObserver = null;
  if (state.card && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(onReflow);
    resizeObserver.observe(state.card);
  }

  const raf1 = requestAnimationFrame(() => {
    requestAnimationFrame(onReflow);
  });

  detachReposition = () => {
    cancelAnimationFrame(raf1);
    window.removeEventListener('resize', onReflow);
    window.removeEventListener('scroll', onReflow, true);
    window.visualViewport?.removeEventListener('resize', onReflow);
    window.visualViewport?.removeEventListener('scroll', onReflow);
    resizeObserver?.disconnect();
    detachReposition = null;
  };
}

function detachRepositionListeners() {
  detachReposition?.();
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
  detachRepositionListeners();
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
  document.documentElement.appendChild(card);

  state.card = card;
  state.host = host;

  positionPreview(card, host);
  attachRepositionListeners();
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
