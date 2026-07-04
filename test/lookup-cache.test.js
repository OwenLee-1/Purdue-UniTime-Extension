import assert from 'node:assert/strict';
import test from 'node:test';

import { professorKey } from '../src/core/blocks.js';

const sentMessages = [];

function makeRmpResult(rawName) {
  const [firstName, lastName] = rawName.split(/\s+/);
  const isJane = firstName === 'Jane';
  return {
    source: 'rmp',
    status: 'ok',
    confidence: 1,
    overall: isJane ? 1.2 : 4.8,
    difficulty: isJane ? 4.6 : 1.8,
    sampleSize: 1,
    detail: {
      name: `${firstName} ${lastName}`,
      reviews: [
        {
          class: 'CS 101',
          quality: isJane ? 1 : 5,
          difficulty: isJane ? 5 : 1,
          comment: isJane ? 'Jane review' : 'John review',
        },
      ],
      recentRatings: [
        {
          class: 'CS 101',
          quality: isJane ? 1 : 5,
          difficulty: isJane ? 5 : 1,
          comment: isJane ? 'Jane review' : 'John review',
        },
      ],
      profileUrl: `https://www.ratemyprofessors.com/professor/${isJane ? 222 : 111}`,
    },
  };
}

function handleMessage(message) {
  switch (message.type) {
    case 'PING':
      return { ok: true };
    case 'LOOKUP_GRADES_BATCH':
      return { ok: true, results: {} };
    case 'LOOKUP_RMP_BATCH':
      return {
        ok: true,
        results: Object.fromEntries(
          message.queries.map((query) => [
            professorKey(query.rawName),
            makeRmpResult(query.rawName),
          ])
        ),
      };
    default:
      return { ok: false, error: `unexpected message: ${message.type}` };
  }
}

globalThis.chrome = {
  runtime: {
    id: 'test-extension',
    lastError: null,
    sendMessage(message, callback) {
      sentMessages.push(message);
      queueMicrotask(() => callback(handleMessage(message)));
    },
  },
};

const { clearLookupCache, queueLookup } = await import('../src/content/lookup.js');

function lookup(rawName, course = 'CS 101') {
  return new Promise((resolve) => {
    queueLookup({ rawName, school: 'purdue', course }, resolve);
  });
}

function rmpBatchCalls() {
  return sentMessages.filter((message) => message.type === 'LOOKUP_RMP_BATCH');
}

test('professor RMP cache does not reuse same-initial last-name hits', async () => {
  clearLookupCache();
  sentMessages.length = 0;

  const john = await lookup('John Smith', 'CS 101');
  assert.equal(john.detail.name, 'John Smith');
  assert.equal(john.overall, 4.8);
  assert.equal(rmpBatchCalls().length, 1);

  const jane = await lookup('Jane Smith', 'CS 102');
  assert.equal(jane.detail.name, 'Jane Smith');
  assert.equal(jane.overall, 1.2);
  assert.equal(
    rmpBatchCalls().length,
    2,
    'same last name and first initial must trigger its own RMP lookup'
  );
});
