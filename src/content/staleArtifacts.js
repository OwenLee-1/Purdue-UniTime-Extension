// Extension-owned DOM can survive an extension reload/update while the old
// content-script listeners and module state are gone. Clear it before booting a
// fresh content-script instance so stale overlays cannot keep UniTime frozen.

const STALE_UI_SELECTOR = [
  '#rmp-freeze-catcher',
  '.rmp-sidebar-backdrop',
  '#rmp-page-settings-host',
  '.rmp-professor-panel',
  '.rmp-hover-preview',
  '.rmp-badge-host',
].join(',');

const STALE_HTML_ATTRS = [
  'data-rmp-freeze-active',
  'data-rmp-freeze-popups',
  'data-rmp-gesture-swallow-until',
];

const PROCESSED_ATTR = 'data-rmp-seen';

/**
 * @param {Document} [doc]
 */
export function clearStaleExtensionArtifacts(doc = document) {
  if (!doc?.querySelectorAll) return;

  for (const attr of STALE_HTML_ATTRS) {
    doc.documentElement?.removeAttribute?.(attr);
  }

  for (const el of doc.querySelectorAll(STALE_UI_SELECTOR)) {
    el.remove();
  }

  for (const el of doc.querySelectorAll(`[${PROCESSED_ATTR}]`)) {
    el.removeAttribute(PROCESSED_ATTR);
  }
}
