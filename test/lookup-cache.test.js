import assert from 'node:assert/strict';
import test from 'node:test';

import { professorKey } from '../src/core/blocks.js';

const rmpBatchRawNames = [];

globalThis.chrome = {
  runtime: {
    id: 'test-extension',
    lastError: null,
    sendMessage(message, callback) {
      if (message.type === 'PING') {
        callback({ ok: true });
        return;
      }

      if (message.type === 'LOOKUP_GRADES_BATCH') {
        callback({ ok: true, results: {} });
        return;
      }

      if (message.type === 'LOOKUP_RMP_BATCH') {
        const results = {};
        for (const query of message.queries || []) {
          rmpBatchRawNames.push(query.rawName);
          const overall = query.rawName.startsWith('John') ? 4.8 : 2.1;
          results[professorKey(query.rawName)] = {
            source: 'rmp',
            status: 'ok',
            confidence: 1,
            overall,
            difficulty: 3,
            sampleSize: 1,
            detail: {
              name: query.rawName,
              reviews: [{ comment: `${query.rawName} review`, quality: overall }],
              recentRatings: [{ quality: overall }],
            },
          };
        }
        callback({ ok: true, results });
        return;
      }

      callback({ ok: false, error: `Unexpected message type ${message.type}` });
    },
  },
};

const { clearLookupCache, queueLookup } = await import('../src/content/lookup.js');

function lookup(query) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('lookup timed out')), 1000);
    queueLookup(query, (result) => {
      clearTimeout(timeout);
      resolve(result);
    });
  });
}

test('RMP professor cache does not reuse same-initial last-name matches', async () => {
  clearLookupCache();
  rmpBatchRawNames.length = 0;

  const john = await lookup({ rawName: 'John Smith', course: 'CS 101' });
  const jane = await lookup({ rawName: 'Jane Smith', course: 'CS 102' });

  assert.equal(john.overall, 4.8);
  assert.equal(jane.overall, 2.1);
  assert.deepEqual(rmpBatchRawNames, ['John Smith', 'Jane Smith']);
});
