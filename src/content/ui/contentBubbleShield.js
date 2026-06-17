// Content-script bubble shield (no inline page injection — CSP safe).
// Stops RMP UI clicks from bubbling to UniTime document handlers.

const RMP_SEL =
  '.rmp-professor-panel,#rmp-page-settings-host,.rmp-hover-preview,.rmp-badge-host';
const TYPES = ['mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup'];

/** @param {Event} e */
function shieldBubble(e) {
  const t = e.target;
  if (t instanceof Element && t.closest(RMP_SEL)) {
    e.stopPropagation();
  }
}

for (const type of TYPES) {
  document.addEventListener(type, shieldBubble, false);
  window.addEventListener(type, shieldBubble, false);
}
