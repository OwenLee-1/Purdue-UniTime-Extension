// Safe chrome.runtime.sendMessage helpers (MV3 service worker can be asleep).

/**
 * @param {object} message
 * @returns {Promise<object>}
 */
export function sendToBackground(message) {
  return new Promise((resolve) => {
    if (!chrome?.runtime?.id) {
      resolve({ ok: false, error: 'Extension context unavailable' });
      return;
    }
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(
          response && typeof response === 'object'
            ? response
            : { ok: false, error: 'No response from background (worker may be inactive)' }
        );
      });
    } catch (err) {
      resolve({ ok: false, error: String(err) });
    }
  });
}

/**
 * @returns {Promise<boolean>}
 */
export async function wakeBackground() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await sendToBackground({ type: 'PING' });
    if (res.ok) return true;
    await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
  }
  return false;
}
