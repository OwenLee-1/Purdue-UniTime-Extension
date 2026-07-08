import test from 'node:test';
import assert from 'node:assert/strict';

import { clearStaleExtensionArtifacts } from '../src/content/staleArtifacts.js';

class TestElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.id = '';
    this.className = '';
    this.parentNode = null;
    this.children = [];
    this.attributes = new Map();
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  setAttribute(name, value = '') {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }
}

function matchesToken(el, token) {
  if (token.startsWith('#')) return el.id === token.slice(1);
  if (token.startsWith('.')) return el.className.split(/\s+/).includes(token.slice(1));
  if (token.startsWith('[') && token.endsWith(']')) {
    return el.hasAttribute(token.slice(1, -1));
  }
  return false;
}

function collectMatches(root, selector) {
  const tokens = selector.split(',').map((token) => token.trim());
  const matches = [];

  function visit(el) {
    if (tokens.some((token) => matchesToken(el, token))) matches.push(el);
    for (const child of el.children) visit(child);
  }

  visit(root);
  return matches;
}

function createDocument() {
  const documentElement = new TestElement('html');
  const body = documentElement.appendChild(new TestElement('body'));
  return {
    documentElement,
    body,
    querySelectorAll(selector) {
      return collectMatches(documentElement, selector);
    },
  };
}

function child({ id = '', className = '', attrs = [] } = {}) {
  const el = new TestElement();
  el.id = id;
  el.className = className;
  for (const attr of attrs) el.setAttribute(attr, '');
  return el;
}

test('clearStaleExtensionArtifacts removes orphan freeze UI and detector markers', () => {
  const doc = createDocument();
  doc.documentElement.setAttribute('data-rmp-freeze-active', '');
  doc.documentElement.setAttribute('data-rmp-freeze-popups', '');
  doc.documentElement.setAttribute('data-rmp-gesture-swallow-until', String(Date.now() + 1000));

  const catcher = doc.body.appendChild(child({ id: 'rmp-freeze-catcher', className: 'rmp-sidebar-backdrop' }));
  const settings = doc.body.appendChild(child({ id: 'rmp-page-settings-host' }));
  const panel = doc.body.appendChild(child({ className: 'rmp-professor-panel' }));
  const hover = doc.body.appendChild(child({ className: 'rmp-hover-preview' }));
  const instructorCell = doc.body.appendChild(child({ attrs: ['data-rmp-seen'] }));
  const badge = instructorCell.appendChild(child({ className: 'rmp-badge-host' }));
  const unrelated = doc.body.appendChild(child({ className: 'unitime-row' }));

  clearStaleExtensionArtifacts(doc);

  assert.equal(doc.documentElement.hasAttribute('data-rmp-freeze-active'), false);
  assert.equal(doc.documentElement.hasAttribute('data-rmp-freeze-popups'), false);
  assert.equal(doc.documentElement.hasAttribute('data-rmp-gesture-swallow-until'), false);
  assert.equal(instructorCell.hasAttribute('data-rmp-seen'), false);
  assert.equal(catcher.parentNode, null);
  assert.equal(settings.parentNode, null);
  assert.equal(panel.parentNode, null);
  assert.equal(hover.parentNode, null);
  assert.equal(badge.parentNode, null);
  assert.equal(unrelated.parentNode, doc.body);
});
