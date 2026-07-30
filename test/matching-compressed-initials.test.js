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

describe('compressed multi-initial UniTime names', () => {
  it('parses space-separated and dotted multi-initial forms', () => {
    assert.deepEqual(normalizeName('D L Johnstone'), {
      first: 'dl',
      last: 'johnstone',
      isPlaceholder: false,
      firstIsCompressedInitials: true,
    });
    assert.deepEqual(normalizeName('P P Cunningham'), {
      first: 'pp',
      last: 'cunningham',
      isPlaceholder: false,
      firstIsCompressedInitials: true,
    });
    assert.deepEqual(normalizeName('Johnstone, D.L.'), {
      first: 'dl',
      last: 'johnstone',
      isPlaceholder: false,
      firstIsCompressedInitials: true,
    });
    assert.deepEqual(normalizeName('Johnstone, D L'), {
      first: 'dl',
      last: 'johnstone',
      isPlaceholder: false,
      firstIsCompressedInitials: true,
    });
  });

  it('matches compressed initials to full first names on the shared initial', () => {
    assert.ok(score('D L Johnstone', 'David', 'Johnstone') >= CONFIDENCE_THRESHOLD);
    assert.ok(score('P P Cunningham', 'Patricia', 'Cunningham') >= CONFIDENCE_THRESHOLD);
    assert.ok(score('Johnstone, D.L.', 'Donald', 'Johnstone') >= CONFIDENCE_THRESHOLD);
  });

  it('does not treat unrelated full first names as matches (John/James class)', () => {
    assert.ok(score('John Chen', 'James', 'Chen') < CONFIDENCE_THRESHOLD);
    assert.ok(score('Mary Wang', 'Mark', 'Wang') < CONFIDENCE_THRESHOLD);
    assert.ok(score('David Kim', 'Daniel', 'Kim') < CONFIDENCE_THRESHOLD);
  });

  it('rejects short two-letter prefix false positives (Jo/John, Al/Alice)', () => {
    assert.ok(score('Jo Smith', 'John', 'Smith') < CONFIDENCE_THRESHOLD);
    assert.ok(score('Jo Smith', 'Joan', 'Smith') < CONFIDENCE_THRESHOLD);
    assert.ok(score('Al Johnson', 'Alice', 'Johnson') < CONFIDENCE_THRESHOLD);
    assert.ok(score('Ed Brown', 'Edward', 'Brown') < CONFIDENCE_THRESHOLD);
  });

  it('still accepts nickname prefixes of length >= 3', () => {
    assert.ok(score('Rob Smith', 'Robert', 'Smith') >= CONFIDENCE_THRESHOLD);
    assert.ok(score('Chris Lee', 'Christopher', 'Lee') >= CONFIDENCE_THRESHOLD);
    assert.ok(score('Alex Chen', 'Alexander', 'Chen') >= CONFIDENCE_THRESHOLD);
  });

  it('still accepts single-initial and exact first names', () => {
    assert.equal(score('John Chen', 'John', 'Chen'), 1);
    assert.ok(score('J Chen', 'James', 'Chen') >= CONFIDENCE_THRESHOLD);
    assert.ok(score('S Weng', 'S', 'Weng') >= CONFIDENCE_THRESHOLD);
  });

  it('does not attribute a same-initial full name when UniTime uses compressed initials and rivals tie', () => {
    const rivals = [
      {
        firstName: 'Denise',
        lastName: 'Johnstone',
        numRatings: 80,
        legacyId: 1,
        department: 'Physics',
      },
      {
        firstName: 'David',
        lastName: 'Johnstone',
        numRatings: 12,
        legacyId: 2,
        department: 'Mathematics',
      },
    ];
    // Dept hint uniquely selects Mathematics for MA courses.
    const pick = pickBestCandidate('D L Johnstone', rivals, { course: 'MA 16100' });
    assert.equal(pick.status, 'ok');
    assert.equal(pick.candidate?.legacyId, 2);
  });

  it('does not attribute Jo Smith to John when only John exists in RMP results', () => {
    const onlyJohn = [
      {
        firstName: 'John',
        lastName: 'Smith',
        numRatings: 55,
        legacyId: 9,
        department: 'Mathematics',
      },
    ];
    const pick = pickBestCandidate('Jo Smith', onlyJohn, { course: 'MA 26100' });
    assert.equal(pick.status, 'no_match');
    assert.equal(pick.candidate, null);
  });
});
