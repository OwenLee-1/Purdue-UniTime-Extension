import test from 'node:test';
import assert from 'node:assert/strict';

function installMinimalDom() {
  const listeners = { document: new Map(), window: new Map() };

  class TestElement {
    constructor(className = '', parent = null) {
      this.tagName = 'DIV';
      this.id = '';
      this.className = className;
      this.parentElement = parent;
      this.style = {};
      this.isConnected = false;
      this.attrs = new Map();
    }

    setAttribute(name, value = '') {
      this.attrs.set(name, String(value));
    }

    removeAttribute(name) {
      this.attrs.delete(name);
    }

    hasAttribute(name) {
      return this.attrs.has(name);
    }

    getAttribute(name) {
      return this.attrs.has(name) ? this.attrs.get(name) : null;
    }

    matches(selector) {
      const classes = this.className.split(/\s+/).filter(Boolean);
      return String(selector)
        .split(',')
        .some((part) => {
          const token = part.trim();
          if (token.startsWith('.')) return classes.includes(token.slice(1));
          if (token.startsWith('#')) return this.id === token.slice(1);
          return false;
        });
    }

    closest(selector) {
      let node = this;
      while (node) {
        if (typeof node.matches === 'function' && node.matches(selector)) return node;
        node = node.parentElement || null;
      }
      return null;
    }

    remove() {
      this.isConnected = false;
    }
  }

  function addListener(target, type, handler) {
    if (!target.has(type)) target.set(type, []);
    target.get(type).push(handler);
  }

  const state = { hits: [] };

  globalThis.Element = TestElement;
  globalThis.HTMLElement = TestElement;
  globalThis.document = {
    documentElement: new TestElement(),
    body: {
      appendChild(el) {
        el.isConnected = true;
        return el;
      },
    },
    addEventListener(type, handler) {
      addListener(listeners.document, type, handler);
    },
    createElement() {
      return new TestElement();
    },
    querySelectorAll() {
      return [];
    },
    elementsFromPoint() {
      return state.hits;
    },
  };
  globalThis.window = {
    addEventListener(type, handler) {
      addListener(listeners.window, type, handler);
    },
    setTimeout: globalThis.setTimeout,
  };

  function dispatch(type, event) {
    event.type = type;
    let stopped = false;
    event.preventDefault = () => {
      event.defaultPrevented = true;
    };
    event.stopPropagation = () => {
      stopped = true;
    };
    event.stopImmediatePropagation = () => {
      stopped = true;
    };

    const run = (list) => {
      for (const handler of list || []) {
        handler(event);
        if (stopped) return true;
      }
      return false;
    };

    // Capture path: window listeners, then document listeners.
    if (run(listeners.window.get(type))) return false;
    if (run(listeners.document.get(type))) return false;
    return true;
  }

  return { TestElement, state, listeners, dispatch };
}

test('settings open does not swallow UniTime clicks for the rest of the session', async () => {
  const dom = installMinimalDom();
  const freeze = await import('../src/content/ui/freezeController.js');

  let now = 10_000_000;
  const realNow = Date.now;
  Date.now = () => now;

  let pageClicks = 0;
  dom.listeners.document.set('pointerdown', [
    ...(dom.listeners.document.get('pointerdown') || []),
    () => {
      pageClicks += 1;
    },
  ]);

  const fab = new dom.TestElement('rmp-settings-fab rmp-settings-close');
  dom.state.hits = [fab];

  // Same path as the settings fab: swallow the gesture, then freeze on the next turn.
  freeze.scheduleProtectedDismiss(() => {
    freeze.setBackgroundFreeze(true, {
      reason: 'settings',
      onOutsideClick() {},
    });
  }, {
    pointerId: 1,
    clientX: 12,
    clientY: 18,
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {},
  });

  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(freeze.getActiveFreezeReasons(), ['settings']);

  // pointerup lands on the now-open settings button. Capture handling stops the
  // event, which used to skip the listener that clears the swallowed pointer id.
  const pointerUpReachedPage = dom.dispatch('pointerup', {
    pointerId: 1,
    clientX: 12,
    clientY: 18,
  });
  assert.equal(pointerUpReachedPage, false);

  // Escape closes the menu without another pointerup that could clear the id.
  freeze.setBackgroundFreeze(false, { reason: 'settings' });
  assert.deepEqual(freeze.getActiveFreezeReasons(), []);

  const pageEvent = () => ({ pointerId: 1, clientX: 40, clientY: 40 });
  dom.state.hits = [new dom.TestElement('unitime-row')];

  pageClicks = 0;
  dom.dispatch('pointerdown', pageEvent());
  assert.equal(pageClicks, 0, 'clicks during the short post-gesture swallow should not reach UniTime');

  now += 500;
  pageClicks = 0;
  dom.dispatch('pointerdown', pageEvent());
  assert.equal(pageClicks, 1, 'UniTime should receive clicks once the gesture swallow expires');

  Date.now = realNow;
});
