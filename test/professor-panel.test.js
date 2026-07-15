import assert from 'node:assert/strict';
import test from 'node:test';

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.style = {};
    this.children = [];
    this.listeners = new Map();
    this.textContent = '';
    this.value = '';
  }

  append(...children) {
    this.children.push(...children);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }
}

const createdElements = [];
const fakeDocument = {
  createElement(tagName) {
    const element = new FakeElement(tagName);
    createdElements.push(element);
    return element;
  },
  createTextNode(text) {
    return { textContent: text };
  },
};

globalThis.document = fakeDocument;

const { createProfessorPanel } = await import('../src/content/ui/ProfessorPanel.js');

test('flushPendingChanges preserves an edited professor note before teardown', () => {
  createdElements.length = 0;
  const patches = [];
  const panel = createProfessorPanel(
    { status: 'ready', detail: {} },
    {
      rawName: 'Ada Lovelace',
      userMark: { rawName: 'Ada Lovelace', note: 'old note' },
      onMarkUpdate: (patch) => patches.push(patch),
    },
    fakeDocument
  );
  const noteInput = createdElements.find((element) => element.tagName === 'TEXTAREA');

  assert.ok(noteInput);
  noteInput.value = 'new note';
  panel.flushPendingChanges();
  panel.flushPendingChanges();

  assert.deepEqual(patches, [{ note: 'new note' }]);
});

test('change save is not duplicated by the teardown flush', () => {
  createdElements.length = 0;
  const patches = [];
  const panel = createProfessorPanel(
    { status: 'ready', detail: {} },
    {
      rawName: 'Grace Hopper',
      userMark: null,
      onMarkUpdate: (patch) => patches.push(patch),
    },
    fakeDocument
  );
  const noteInput = createdElements.find((element) => element.tagName === 'TEXTAREA');

  noteInput.value = 'compiler pioneer';
  noteInput.listeners.get('change')();
  panel.flushPendingChanges();

  assert.deepEqual(patches, [{ note: 'compiler pioneer' }]);
});
