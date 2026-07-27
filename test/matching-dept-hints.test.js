import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickBestCandidate } from '../src/core/matching.js';

describe('department hint matching for ambiguous RMP candidates', () => {
  it('does not treat Physics as a CS department match via substring "cs"', () => {
    const result = pickBestCandidate(
      'J Smith',
      [
        { firstName: 'Jane', lastName: 'Smith', numRatings: 40, legacyId: 1, department: 'Physics' },
        {
          firstName: 'John',
          lastName: 'Smith',
          numRatings: 15,
          legacyId: 2,
          department: 'Computer Science',
        },
      ],
      { course: 'CS 18000' }
    );

    assert.equal(result.status, 'ok');
    assert.equal(result.candidate?.firstName, 'John');
    assert.equal(result.candidate?.department, 'Computer Science');
  });

  it('does not treat Mathematics as the sole CS match via substring "cs"', () => {
    const result = pickBestCandidate(
      'M Chen',
      [
        {
          firstName: 'Mary',
          lastName: 'Chen',
          numRatings: 12,
          legacyId: 3,
          department: 'Mathematics',
        },
        { firstName: 'Mark', lastName: 'Chen', numRatings: 10, legacyId: 4, department: 'History' },
      ],
      { course: 'CS 25100' }
    );

    assert.equal(result.status, 'ambiguous');
    assert.equal(result.candidate, null);
  });

  it('does not treat Economics as the sole CS match via substring "cs"', () => {
    const result = pickBestCandidate(
      'A Lee',
      [
        {
          firstName: 'Alice',
          lastName: 'Lee',
          numRatings: 8,
          legacyId: 5,
          department: 'Economics',
        },
        { firstName: 'Adam', lastName: 'Lee', numRatings: 5, legacyId: 6, department: 'History' },
      ],
      { course: 'CS 18200' }
    );

    assert.equal(result.status, 'ambiguous');
    assert.equal(result.candidate, null);
  });

  it('still prefers a real Computer Science department match for CS courses', () => {
    const result = pickBestCandidate(
      'J Smith',
      [
        { firstName: 'Jane', lastName: 'Smith', numRatings: 40, legacyId: 1, department: 'History' },
        {
          firstName: 'John',
          lastName: 'Smith',
          numRatings: 15,
          legacyId: 2,
          department: 'Computer Science',
        },
      ],
      { course: 'CS 18000' }
    );

    assert.equal(result.status, 'ok');
    assert.equal(result.candidate?.firstName, 'John');
  });

  it('still prefers Mathematics for MA courses', () => {
    const result = pickBestCandidate(
      'J Wong',
      [
        { firstName: 'Jane', lastName: 'Wong', numRatings: 10, legacyId: 7, department: 'History' },
        {
          firstName: 'John',
          lastName: 'Wong',
          numRatings: 8,
          legacyId: 8,
          department: 'Mathematics',
        },
      ],
      { course: 'MA 26100' }
    );

    assert.equal(result.status, 'ok');
    assert.equal(result.candidate?.firstName, 'John');
    assert.equal(result.candidate?.department, 'Mathematics');
  });
});
