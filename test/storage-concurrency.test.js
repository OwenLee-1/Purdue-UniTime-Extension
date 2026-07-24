import assert from 'node:assert/strict';
import test from 'node:test';

function createStorageMock(initial = {}, delayMs = 15) {
  /** @type {Record<string, any>} */
  let data = structuredClone(initial);

  const delay = () => new Promise((resolve) => setTimeout(resolve, delayMs));

  return {
    local: {
      async get(key) {
        await delay();
        if (typeof key === 'string') {
          return { [key]: structuredClone(data[key]) };
        }
        return structuredClone(data);
      },
      async set(values) {
        await delay();
        data = { ...data, ...structuredClone(values) };
      },
    },
    snapshot() {
      return structuredClone(data);
    },
  };
}

test('concurrent mark patches for one professor merge instead of clobbering', async () => {
  const storage = createStorageMock();
  globalThis.chrome = { storage };

  const { updateMark, getMark } = await import('../src/core/userMarks.js');

  await Promise.all([
    updateMark('Ada Lovelace', { note: 'important note' }),
    updateMark('Ada Lovelace', { sentiment: 'like' }),
  ]);

  const saved = await getMark('Ada Lovelace');
  assert.equal(saved?.note, 'important note');
  assert.equal(saved?.sentiment, 'like');
});

test('concurrent mark patches for different professors both persist', async () => {
  const storage = createStorageMock();
  globalThis.chrome = { storage };

  const { updateMark, getMark } = await import('../src/core/userMarks.js');

  await Promise.all([
    updateMark('Ada Lovelace', { note: 'note A' }),
    updateMark('Grace Hopper', { sentiment: 'like' }),
  ]);

  assert.equal((await getMark('Ada Lovelace'))?.note, 'note A');
  assert.equal((await getMark('Grace Hopper'))?.sentiment, 'like');
});

test('concurrent block updates for different professors both persist', async () => {
  const storage = createStorageMock({
    'user-blocks': {
      entries: {
        'purdue:lovelace:ada': { rawName: 'Ada Lovelace', blockedAt: 1 },
        'purdue:hopper:grace': { rawName: 'Grace Hopper', blockedAt: 2 },
      },
    },
  });
  globalThis.chrome = { storage };

  const { setBlocked, getBlocksMap } = await import('../src/core/blocks.js');

  await Promise.all([
    setBlocked('Ada Lovelace', false),
    setBlocked('Grace Hopper', false),
  ]);

  const map = await getBlocksMap();
  assert.deepEqual(map, {});
});
