// The "hands" of the on-page helper: it places a badge into the page.
//
// Key idea: we mount our badge inside a SHADOW DOM — a sealed style bubble so
// UniTime's global GWT styles can't change how our badge looks, and our styles
// can't leak out and disturb the page.
//
// Because a rating arrives asynchronously (the background worker has to query
// RateMyProfessors), we inject a "loading" badge immediately and then swap in the
// real result via the returned setResult() handle.

import { createBadge } from './ui/Badge.js';
import { createPopover } from './ui/Popover.js';

/**
 * @typedef {Object} BadgeHandle
 * @property {(result: object) => void} setResult  Replace the badge contents with a result.
 * @property {() => void} remove                   Remove the badge entirely.
 */

/**
 * Inject a (loading) badge into an instructor cell.
 * @param {Element} target  The instructor cell we detected.
 * @returns {BadgeHandle | null}  Null if a badge already exists here.
 */
export function injectBadge(target) {
  if (target.querySelector('.rmp-badge-host')) return null;

  const host = document.createElement('span');
  host.className = 'rmp-badge-host';
  host.style.marginLeft = '6px';
  host.style.display = 'inline-block';
  host.style.verticalAlign = 'middle';

  const shadow = host.attachShadow({ mode: 'open' });
  let current = createBadge({ status: 'loading' });
  shadow.appendChild(current);
  target.appendChild(host);

  let latest = { status: 'loading' };
  let popover = null;
  let hideTimer = null;

  function positionPopover() {
    if (!popover) return;
    const rect = host.getBoundingClientRect();
    // Prefer below the badge; flip above if not enough room.
    const below = window.innerHeight - rect.bottom;
    popover.style.left = `${Math.max(8, rect.left)}px`;
    if (below < 180) {
      popover.style.top = '';
      popover.style.bottom = `${window.innerHeight - rect.top + 6}px`;
    } else {
      popover.style.bottom = '';
      popover.style.top = `${rect.bottom + 6}px`;
    }
  }

  function showPopover() {
    if (latest.status !== 'ok') return;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (popover) return;
    popover = createPopover(latest);
    popover.addEventListener('mouseenter', () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    });
    popover.addEventListener('mouseleave', scheduleHide);
    shadow.appendChild(popover);
    positionPopover();
  }

  function hidePopover() {
    if (popover) {
      popover.remove();
      popover = null;
    }
  }

  function scheduleHide() {
    // Small delay so the user can move the mouse from badge onto the card (e.g. to click the link).
    hideTimer = setTimeout(hidePopover, 150);
  }

  host.addEventListener('mouseenter', showPopover);
  host.addEventListener('mouseleave', scheduleHide);

  return {
    setResult(result) {
      // staff/TBA: there's no professor here, so don't show anything.
      if (result?.status === 'staff_tba') {
        host.remove();
        return;
      }
      latest = result;
      const next = createBadge(result);
      shadow.replaceChild(next, current);
      current = next;
    },
    remove() {
      hidePopover();
      host.remove();
    },
  };
}
