import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  OFFSCREEN_DOCUMENT_PATH,
  resolveOffscreenDocumentUrl,
} from '../src/background/offscreenFetch.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('offscreen document path points at the HTML page, not a JS loader', () => {
  assert.equal(OFFSCREEN_DOCUMENT_PATH, 'src/offscreen/index.html');
  assert.match(OFFSCREEN_DOCUMENT_PATH, /\.html$/);
  assert.doesNotMatch(OFFSCREEN_DOCUMENT_PATH, /\.js$/);
});

test('resolveOffscreenDocumentUrl uses chrome.runtime.getURL for the HTML path', () => {
  const calls = [];
  const url = resolveOffscreenDocumentUrl({
    getURL(path) {
      calls.push(path);
      return `chrome-extension://testid/${path}`;
    },
  });
  assert.deepEqual(calls, [OFFSCREEN_DOCUMENT_PATH]);
  assert.equal(url, `chrome-extension://testid/${OFFSCREEN_DOCUMENT_PATH}`);
  assert.match(url, /\.html$/);
});

test('offscreenFetch source never imports HTML via CRXJS ?script', () => {
  const source = readFileSync(join(root, 'src/background/offscreenFetch.js'), 'utf8');
  assert.doesNotMatch(source, /from\s+['"][^'"]*\?script['"]/);
  assert.doesNotMatch(source, /import\s+[^;]*\?script/);
  assert.match(source, /resolveOffscreenDocumentUrl/);
  assert.match(source, /OFFSCREEN_DOCUMENT_PATH/);
});

test('source offscreen HTML exists for createDocument', () => {
  assert.equal(existsSync(join(root, OFFSCREEN_DOCUMENT_PATH)), true);
  const html = readFileSync(join(root, OFFSCREEN_DOCUMENT_PATH), 'utf8');
  assert.match(html, /offscreen\.js/);
});

test('built service worker createDocument URL is HTML when dist exists', () => {
  const distAssets = join(root, 'dist/assets');
  if (!existsSync(distAssets)) return;

  const swFiles = readdirSync(distAssets).filter(
    (name) => name.startsWith('service-worker.js-') && name.endsWith('.js')
  );
  assert.ok(swFiles.length > 0, 'expected built service-worker chunk');

  for (const name of swFiles) {
    const source = readFileSync(join(distAssets, name), 'utf8');
    assert.match(source, /createDocument/);
    assert.doesNotMatch(
      source,
      /createDocument\(\{url:"[^"]*\.js"/,
      `${name} must not pass a .js asset to createDocument`
    );
    assert.doesNotMatch(source, /index\.html-loader-/);
  }

  assert.equal(existsSync(join(root, 'dist', OFFSCREEN_DOCUMENT_PATH)), true);
});
