// Singleton right-hand professor panel — one open at a time across all badges.

import { createProfessorPanel } from './ProfessorPanel.js';
import { hideHoverPreview } from './hoverPreviewManager.js';

/** @type {{ root: HTMLElement, backdrop: HTMLElement, host: Element | null } | null} */
let openPanel = null;

/**
 * @param {import('../../core/providers/Provider.js').ProviderResult} result
 * @param {import('./ProfessorPanel.js').PanelHooks} hooks
 * @param {Element} host  Badge host element (for toggle-close on same badge)
 */
export function openProfessorSidebar(result, hooks, host) {
  hideHoverPreview();

  if (openPanel?.host === host) {
    closeProfessorSidebar();
    return;
  }

  closeProfessorSidebar();

  const mergedHooks = {
    ...hooks,
    onClose: () => {
      closeProfessorSidebar();
      hooks.onClose?.();
    },
  };

  const { root, backdrop } = createProfessorPanel(result, mergedHooks);
  document.body.append(backdrop, root);
  openPanel = { root, backdrop, host };
}

export function closeProfessorSidebar() {
  if (!openPanel) return;
  openPanel.backdrop.remove();
  openPanel.root.remove();
  openPanel = null;
}

/**
 * @param {import('../../core/providers/Provider.js').ProviderResult} result
 * @param {import('./ProfessorPanel.js').PanelHooks} hooks
 * @param {Element} host
 */
export function refreshProfessorSidebar(result, hooks, host) {
  if (!openPanel || openPanel.host !== host) return;
  const wasOpen = true;
  closeProfessorSidebar();
  if (wasOpen) openProfessorSidebar(result, hooks, host);
}

export function isSidebarOpenFor(host) {
  return openPanel?.host === host;
}
