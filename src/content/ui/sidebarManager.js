// Singleton right-hand professor panel — one open at a time across all badges.
// Mounted on document.body (same pattern as settings menu — iframes are blocked by
// UniTime's frame-src CSP and never receive panel content).

import { createProfessorPanel } from './ProfessorPanel.js';
import { hideHoverPreview } from './hoverPreviewManager.js';
import { bringRmpLayersToFront } from './unitimeBackdrop.js';
import { applyUiLayerZ, setBackgroundFreeze } from './freezeController.js';

/** @type {{ root: HTMLElement, host: Element | null } | null} */
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

  const { root: panel } = createProfessorPanel(result, hooks, document);
  document.body.appendChild(panel);
  applyUiLayerZ(panel);

  bringRmpLayersToFront();
  openPanel = { root: panel, host };
  setBackgroundFreeze(true, {
    reason: 'sidebar',
    onOutsideClick: () => {
      closeProfessorSidebar();
      hooks.onClose?.();
    },
  });
}

export function closeProfessorSidebar() {
  if (!openPanel) return;
  setBackgroundFreeze(false, { reason: 'sidebar' });
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
  closeProfessorSidebar();
  openProfessorSidebar(result, hooks, host);
}

export function isSidebarOpenFor(host) {
  return openPanel?.host === host;
}
