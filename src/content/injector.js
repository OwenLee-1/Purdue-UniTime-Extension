// The "hands" of the on-page helper: it places a badge into the page.

import { createBadge } from './ui/Badge.js';
import {
  openProfessorSidebar,
  closeProfessorSidebar,
  refreshProfessorSidebar,
  isSidebarOpenFor,
} from './ui/sidebarManager.js';
import {
  hideHoverPreview,
  showHoverPreview,
  refreshHoverPreview,
  isHoverPreviewOpenFor,
  scheduleHideHoverPreview,
} from './ui/hoverPreviewManager.js';
import { setBlocked, isBlocked } from '../core/blocks.js';
import { getMark, updateMark } from '../core/userMarks.js';

const HOVER_SHOW_DELAY_MS = 280;

/**
 * @typedef {Object} BadgeHandle
 * @property {string} [rawName]
 * @property {string} [courseContext]
 * @property {import('./detector.js').InstructorCandidate} [candidate]
 * @property {Element} [element]
 * @property {object} [entry]
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
  host.style.cursor = 'pointer';

  const shadow = host.attachShadow({ mode: 'open' });
  let current = createBadge({ status: 'loading' });
  shadow.appendChild(current);
  target.appendChild(host);

  let latest = { status: 'loading', displayName: ctx.rawName, userMark: null };
  /** @type {ReturnType<typeof setTimeout> | null} */
  let hoverShowTimer = null;

  function renderBadge() {
    const next = createBadge(latest);
    shadow.replaceChild(next, current);
    current = next;
  }

  function clearHoverShowTimer() {
    if (hoverShowTimer) {
      clearTimeout(hoverShowTimer);
      hoverShowTimer = null;
    }
  }

  function scheduleHoverPreview() {
    if (isSidebarOpenFor(host)) return;
    clearHoverShowTimer();
    hoverShowTimer = setTimeout(() => {
      hoverShowTimer = null;
      showHoverPreview(host, latest);
    }, HOVER_SHOW_DELAY_MS);
  }

  function onHostMouseLeave() {
    clearHoverShowTimer();
    scheduleHideHoverPreview();
  }

  async function panelHooks() {
    const [blocked, userMark] = await Promise.all([
      ctx.rawName ? isBlocked(ctx.rawName) : false,
      ctx.rawName ? getMark(ctx.rawName) : null,
    ]);
    latest.userMark = userMark;

    return {
      rawName: ctx.rawName,
      isBlocked: blocked,
      userMark,
      onMarkUpdate: applyMarkPatch,
      onBlockToggle: async (nextBlocked) => {
        if (!ctx.rawName) return;
        await setBlocked(ctx.rawName, nextBlocked);
        if (ctx.onBlockToggle) await ctx.onBlockToggle(nextBlocked);
        closeProfessorSidebar();
      },
    };
  }

  async function applyMarkPatch(patch) {
    if (!ctx.rawName) return;
    const mark = await updateMark(ctx.rawName, patch);
    latest = { ...latest, userMark: mark };
    renderBadge();
    if (isSidebarOpenFor(host)) {
      const hooks = await panelHooks();
      refreshProfessorSidebar(latest, hooks, host);
    }
  }

  async function toggleSidebar() {
    if (latest.status === 'loading' || latest.status === 'staff_tba') return;
    hideHoverPreview();
    const hooks = await panelHooks();
    openProfessorSidebar(latest, hooks, host);
  }

  host.addEventListener('mouseenter', scheduleHoverPreview);
  host.addEventListener('mouseleave', onHostMouseLeave);

  shadow.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearHoverShowTimer();
    hideHoverPreview();
    toggleSidebar();
  });

  return {
    async setResult(result) {
      if (result?.status === 'staff_tba') {
        host.remove();
        if (isHoverPreviewOpenFor(host)) hideHoverPreview();
        if (isSidebarOpenFor(host)) closeProfessorSidebar();
        return;
      }
      const userMark = ctx.rawName ? await getMark(ctx.rawName) : null;
      latest = { ...result, displayName: result.displayName || ctx.rawName, userMark };
      renderBadge();
      if (isHoverPreviewOpenFor(host)) {
        refreshHoverPreview(host, latest);
      }
      if (isSidebarOpenFor(host)) {
        const hooks = await panelHooks();
        refreshProfessorSidebar(latest, hooks, host);
      }
    },
    refreshMark(mark) {
      latest = { ...latest, userMark: mark };
      renderBadge();
    },
    remove() {
      if (isHoverPreviewOpenFor(host)) hideHoverPreview();
      if (isSidebarOpenFor(host)) closeProfessorSidebar();
      host.remove();
    },
  };
}
