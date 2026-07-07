import test from 'node:test';
import assert from 'node:assert/strict';

import { persistIcalUrl } from '../src/content/icalScraper.js';
import {
  ICAL_DETECTED_AT_KEY,
  ICAL_SOURCE_KEY,
  ICAL_STORAGE_KEY,
} from '../src/core/icalUrl.js';

const MANUAL_URL =
  'https://timetable.mypurdue.purdue.edu/UniTime/export?output=ical&calendar=manual-123';
const AUTO_URL =
  'https://timetable.mypurdue.purdue.edu/UniTime/export?output=ical&calendar=auto-456';
const NEXT_AUTO_URL =
  'https://timetable.mypurdue.purdue.edu/UniTime/export?output=ical&calendar=auto-789';

function installChromeStorage(seed = {}) {
  const store = { ...seed };

  globalThis.chrome = {
    storage: {
      local: {
        async get(keys) {
          const out = {};
          for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(store, key)) out[key] = store[key];
          }
          return out;
        },
        async set(values) {
          Object.assign(store, values);
        },
      },
    },
  };

  return store;
}

test('auto-detected iCal URLs do not overwrite a manual URL', async () => {
  const store = installChromeStorage({
    [ICAL_STORAGE_KEY]: MANUAL_URL,
    [ICAL_SOURCE_KEY]: 'manual',
  });

  const persisted = await persistIcalUrl(AUTO_URL, 'dom-update');

  assert.equal(persisted, false);
  assert.equal(store[ICAL_STORAGE_KEY], MANUAL_URL);
  assert.equal(store[ICAL_SOURCE_KEY], 'manual');
  assert.equal(store[ICAL_DETECTED_AT_KEY], undefined);
});

test('matching manual iCal URLs are treated as already persisted', async () => {
  const store = installChromeStorage({
    [ICAL_STORAGE_KEY]: MANUAL_URL,
    [ICAL_SOURCE_KEY]: 'manual',
  });

  const persisted = await persistIcalUrl(MANUAL_URL, 'dom-update');

  assert.equal(persisted, true);
  assert.equal(store[ICAL_STORAGE_KEY], MANUAL_URL);
  assert.equal(store[ICAL_SOURCE_KEY], 'manual');
});

test('auto-detected iCal URLs may replace previous auto detections', async () => {
  const store = installChromeStorage({
    [ICAL_STORAGE_KEY]: AUTO_URL,
    [ICAL_SOURCE_KEY]: 'initial-scan',
  });

  const persisted = await persistIcalUrl(NEXT_AUTO_URL, 'export-dialog');

  assert.equal(persisted, true);
  assert.equal(store[ICAL_STORAGE_KEY], NEXT_AUTO_URL);
  assert.equal(store[ICAL_SOURCE_KEY], 'export-dialog');
  assert.equal(typeof store[ICAL_DETECTED_AT_KEY], 'number');
});
