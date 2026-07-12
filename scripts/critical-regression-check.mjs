import assert from 'node:assert/strict';

import { isReusableRmpResult } from '../src/content/lookup.js';
import { courseMatchesRmpClass } from '../src/core/courseRmpFilter.js';

assert.equal(courseMatchesRmpClass('MA 26100', 'MATH 261'), true);
assert.equal(courseMatchesRmpClass('CS 18000', 'COMPSCI180'), true);
assert.equal(courseMatchesRmpClass('MSE 20000', 'Materials 200'), true);

assert.equal(courseMatchesRmpClass('MA 26100', '261'), false);
assert.equal(courseMatchesRmpClass('MSE 20000', 'ME 200'), false);
assert.equal(courseMatchesRmpClass('ECE 20100', 'EECS 201'), false);

assert.equal(
  isReusableRmpResult({
    status: 'ok',
    overall: 4.2,
    sampleSize: 12,
    detail: {},
  }),
  false
);
assert.equal(
  isReusableRmpResult({
    status: 'ok',
    overall: 4.2,
    sampleSize: 12,
    detail: { recentRatings: [{ quality: 4, class: 'MA 261' }] },
  }),
  true
);
assert.equal(
  isReusableRmpResult({
    status: 'ok',
    overall: 4.2,
    sampleSize: 0,
    detail: {},
  }),
  true
);

console.log('critical regression checks passed');
