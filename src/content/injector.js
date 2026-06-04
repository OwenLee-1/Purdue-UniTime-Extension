// The "hands" of the on-page helper: it places a badge into the page.

import { createBadge } from './ui/Badge.js';
import { createPopover } from './ui/Popover.js';
import { setBlocked, isBlocked } from '../core/blocks.js';
import { getMark, updateMark } from '../core/userMarks.js';

/**
 * @typedef {Object} BadgeHandle
 * @property {(result: object) => void} setResult
 * @property {(mark: import('../core/userMarks.js').UserMark | null) => void} refreshMark
 * @property {() => void} remove
 */

/**
 * @typedef {Object} InjectContext
 * @property {string} rawName
 * @property {(blocked: boolean) => void | Promise<void>} [onBlockToggle]
 */

/**
 * @param {Element} target
 * @param {InjectContext} [ctx]
 * @returns {BadgeHandle | null}
 */
export function injectBadge(target, ctx = {}) {
  if (target.querySelector('.rmp-badge-host')) return null;

  const host = document.createElement('span');
  host.className = 'rmp-badge-host';
  host.dataset.rmpInstructor = ctx.rawName || '';
  host.style.marginLeft = '6px';
  host.style.display = 'inline-block';
  host.style.verticalAlign = 'middle';

  const shadow = host.attachShadow({ mode: 'open' });
  let current = createBadge({ status: 'loading' });
  shadow.appendChild(current);
  target.appendChild(host);

  let latest = { status: 'loading', displayName: ctx.rawName, userMark: null };
  let popover = null;
  let hideTimer = null;

  function renderBadge() {
    const next = createBadge(latest);
    shadow.replaceChild(next, current);
    current = next;
  }

  function positionPopover() {
    if (!popover) return;
    const rect = host.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    popover.style.left = `${Math.max(8, rect.left)}px`;
    if (below < 280) {
      popover.style.top = '';
      popover.style.bottom = `${window.innerHeight - rect.top + 6}px`;
    } else {
      popover.style.bottom = '';
      popover.style.top = `${rect.bottom + 6}px`;
    }
  }

  async function applyMarkPatch(patch) {
    if (!ctx.rawName) return;
    const mark = await updateMark(ctx.rawName, patch);
    latest = { ...latest, userMark: mark };
    renderBadge();
    if (popover) {
      popover.remove();
      popover = null;
    }
  }

  async function showPopover() {
    if (latest.status === 'loading' || latest.status === 'staff_tba') return;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (popover) return;

    const [blocked, userMark] = await Promise.all([
      ctx.rawName ? isBlocked(ctx.rawName) : false,
      ctx.rawName ? getMark(ctx.rawName) : null,
    ]);
    latest.userMark = userMark;

    popover = createPopover(latest, {
      rawName: ctx.rawName,
      isBlocked: blocked,
      userMark,
      onMarkUpdate: applyMarkPatch,
      onBlockToggle: async (nextBlocked) => {
        if (!ctx.rawName) return;
        await setBlocked(ctx.rawName, nextBlocked);
        if (ctx.onBlockToggle) await ctx.onBlockToggle(nextBlocked);
        hidePopover();
      },
    });
    popover.addEventListener('mouseenter', () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    });
    popover.addEventListener('mouseleave', scheduleHide);
    document.body.appendChild(popover);
    positionPopover();
  }

  function hidePopover() {
    if (popover) {
      popover.remove();
      popover = null;
    }
  }

  function scheduleHide() {
    hideTimer = setTimeout(hidePopover, 150);
  }

  host.addEventListener('mouseenter', showPopover);
  host.addEventListener('mouseleave', scheduleHide);

  return {
    async setResult(result) {
      if (result?.status === 'staff_tba') {
        host.remove();
        hidePopover();
        return;
      }
      const userMark = ctx.rawName ? await getMark(ctx.rawName) : null;
      latest = { ...result, displayName: result.displayName || ctx.rawName, userMark };
      renderBadge();
    },
    refreshMark(mark) {
      latest = { ...latest, userMark: mark };
      renderBadge();
    },
    remove() {
      hidePopover();
      host.remove();
    },
  };
}
