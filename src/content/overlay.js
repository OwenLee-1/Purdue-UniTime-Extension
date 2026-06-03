// Controls UniTime's on-hover weekly "schedule preview" (the SuggestionsHintWidget),
// which pops up a what-if time grid when you hover a class/suggestion and clutters
// the screen.
//
// Identified via the [RMP-OVERLAY] discovery probe:
//   <div class="unitime-SuggestionsHint">              <- the pale-yellow box (bg rgb(255,253,221))
//     <div class="unitime-TimeGrid unitime-SuggestionsHintWidget"> <- inner what-if grid
//
// Hiding the outer .unitime-SuggestionsHint removes the whole yellow preview; we
// include the inner widget class too for robustness.
//
// We give the user two ways to hide it: the popup toggle AND a small on-page
// button so they can flip it on/off without opening the popup.

export const OVERLAY_SELECTOR = '.unitime-SuggestionsHint, .unitime-SuggestionsHintWidget';

const STORAGE_KEY = 'hideOverlay';
let styleEl = null;
let updateButtonLabel = null;

/**
 * Apply or remove the CSS that hides the preview. Uses !important so it wins over
 * UniTime's inline styles when GWT tries to show the widget.
 * @param {boolean} hide
 */
export function applyOverlayHiding(hide) {
  if (hide) {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.id = 'rmp-overlay-hide';
    styleEl.textContent = `${OVERLAY_SELECTOR} { display: none !important; }`;
    document.documentElement.appendChild(styleEl);
  } else if (styleEl) {
    styleEl.remove();
    styleEl = null;
  }
}

/**
 * Build the small floating on-page toggle button (mounted in a shadow root so its
 * styling stays isolated from UniTime).
 * @param {boolean} hidden  Current state.
 */
function mountToggleButton(hidden) {
  const host = document.createElement('div');
  host.id = 'rmp-overlay-toggle-host';
  const shadow = host.attachShadow({ mode: 'open' });

  const btn = document.createElement('button');
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    zIndex: '2147483647',
    padding: '7px 12px',
    borderRadius: '9999px',
    border: 'none',
    background: '#111827',
    color: '#fff',
    fontSize: '12px',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: '600',
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    opacity: '0.85',
  });

  function render(isHidden) {
    btn.textContent = isHidden ? '◱ Show schedule preview' : '◰ Hide schedule preview';
  }
  render(hidden);
  updateButtonLabel = render;

  btn.addEventListener('click', async () => {
    const cur = (await chrome.storage.local.get([STORAGE_KEY]))[STORAGE_KEY] === true;
    await chrome.storage.local.set({ [STORAGE_KEY]: !cur });
    // The storage listener (below) applies the change and updates the label.
  });

  shadow.appendChild(btn);
  document.body.appendChild(host);
}

/**
 * Initialize everything: read the saved setting, apply it, mount the button, and
 * keep both the hiding and the button label in sync when the setting changes
 * (from either the popup or the on-page button).
 */
export async function initOverlayControl() {
  const hidden = (await chrome.storage.local.get([STORAGE_KEY]))[STORAGE_KEY] === true;

  applyOverlayHiding(hidden);
  mountToggleButton(hidden);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[STORAGE_KEY]) return;
    const nowHidden = changes[STORAGE_KEY].newValue === true;
    applyOverlayHiding(nowHidden);
    if (updateButtonLabel) updateButtonLabel(nowHidden);
  });
}
