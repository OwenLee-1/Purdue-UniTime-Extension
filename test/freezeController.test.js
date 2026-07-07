import test from 'node:test';
import assert from 'node:assert/strict';

function installMinimalDom() {
  const listeners = { document: new Map(), window: new Map() };

  class TestElement {
    constructor(tagName = 'div') {
      this.tagName = tagName.toUpperCase();
      this.id = '';
      this.className = '';
      this.style = {};
      this.isConnected = false;
    }

    setAttribute(name, value = '') {
      this[name] = String(value);
    }

    removeAttribute(name) {
      delete this[name];
    }

    closest() {
      return null;
    }

    matches() {
      return false;
    }

    remove() {
      this.isConnected = false;
    }
  }

  function addListener(target, type, handler) {
    if (!target.has(type)) target.set(type, []);
    target.get(type).push(handler);
  }

  globalThis.Element = TestElement;
  globalThis.HTMLElement = TestElement;
  globalThis.document = {
    documentElement: new TestElement('html'),
    body: {
      appendChild(el) {
        el.isConnected = true;
        return el;
      },
    },
    addEventListener(type, handler) {
      addListener(listeners.document, type, handler);
    },
    createElement(tagName) {
      return new TestElement(tagName);
    },
    querySelectorAll() {
      return [];
    },
    elementsFromPoint() {
      return [];
    },
  };
  globalThis.window = {
    addEventListener(type, handler) {
      addListener(listeners.window, type, handler);
    },
    setTimeout: globalThis.setTimeout,
  };

  return listeners;
}

function escapeEvent() {
  return {
    key: 'Escape',
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {},
  };
}

test('Escape dismisses only the topmost freeze reason', async () => {
  const listeners = installMinimalDom();
  const freeze = await import('../src/content/ui/freezeController.js');
  const closed = [];

  freeze.setBackgroundFreeze(true, {
    reason: 'sidebar',
    onOutsideClick: () => {
      closed.push('sidebar');
      freeze.setBackgroundFreeze(false, { reason: 'sidebar' });
    },
  });
  freeze.setBackgroundFreeze(true, {
    reason: 'settings',
    onOutsideClick: () => {
      closed.push('settings');
      freeze.setBackgroundFreeze(false, { reason: 'settings' });
    },
  });

  assert.equal(freeze.getTopDismissReason(), 'settings');

  const keydownHandlers = listeners.document.get('keydown') || [];
  assert.equal(keydownHandlers.length, 1);
  keydownHandlers[0](escapeEvent());
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.deepEqual(closed, ['settings']);
  assert.deepEqual(freeze.getActiveFreezeReasons(), ['sidebar']);
  assert.equal(freeze.getTopDismissReason(), 'sidebar');

  freeze.setBackgroundFreeze(false, { reason: 'sidebar' });
});
