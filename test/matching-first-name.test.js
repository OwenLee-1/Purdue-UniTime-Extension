import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CONFIDENCE_THRESHOLD,
  normalizeName,
  normalizeParts,
  pickBestCandidate,
  scoreMatch,
} from '../src/core/matching.js';

function score(raw, first, last) {
  return scoreMatch(normalizeName(raw), normalizeParts(first, last));
}

describe('scoreMatch first-name conservatism', () => {
  it('rejects unrelated full first names that only share an initial', () => {
    assert.ok(score('John Chen', 'James', 'Chen') < CONFIDENCE_THRESHOLD);
    assert.ok(score('John Smith', 'Jane', 'Smith') < CONFIDENCE_THRESHOLD);
    assert.ok(score('Mary Wang', 'Mark', 'Wang') < CONFIDENCE_THRESHOLD);
    assert.ok(score('David Kim', 'Daniel', 'Kim') < CONFIDENCE_THRESHOLD);
  });

  it('still accepts exact, initial, and shared-prefix first names', () => {
    assert.equal(score('John Chen', 'John', 'Chen'), 1);
    assert.ok(score('J Chen', 'James', 'Chen') >= CONFIDENCE_THRESHOLD);
    assert.ok(score('John Chen', 'Johnny', 'Chen') >= CONFIDENCE_THRESHOLD);
    assert.ok(score('Rob Smith', 'Robert', 'Smith') >= CONFIDENCE_THRESHOLD);
  });

  it('does not attribute another same-initial professor when the real one is missing', () => {
    const onlyJames = [
      {
        firstName: 'James',
        lastName: 'Chen',
        numRatings: 40,
        legacyId: 1,
        department: 'Mathematics',
      },
    ];
    const pick = pickBestCandidate('John Chen', onlyJames, { course: 'MA 26100' });
    assert.equal(pick.status, 'no_match');
    assert.equal(pick.candidate, null);
  });

  it('still picks the exact first-name match when both same-initial people exist', () => {
    const both = [
      {
        firstName: 'James',
        lastName: 'Chen',
        numRatings: 40,
        legacyId: 1,
        department: 'Mathematics',
      },
      {
        firstName: 'John',
        lastName: 'Chen',
        numRatings: 5,
        legacyId: 2,
        department: 'Mathematics',
      },
    ];
    const pick = pickBestCandidate('John Chen', both, { course: 'MA 26100' });
    assert.equal(pick.status, 'ok');
    assert.equal(pick.candidate?.legacyId, 2);
  });
});
