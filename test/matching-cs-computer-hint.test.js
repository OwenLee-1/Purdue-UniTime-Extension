import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickBestCandidate, departmentHintsFromCourse } from '../src/core/matching.js';

describe('CS department hints use only "computer science"', () => {
  it('does not list bare computer or cs substrings', () => {
    const hints = departmentHintsFromCourse('CS 18000');
    assert.deepEqual(hints, ['computer science']);
  });

  it('does not uniquely prefer Computer Engineering over ambiguous initials', () => {
    // Live-shaped case: UniTime "J Davis" on a CS course. Bare "computer"
    // made CompE the unique department hit; without it this stays ambiguous.
    const candidates = [
      {
        firstName: 'James',
        lastName: 'Davis',
        numRatings: 6,
        legacyId: 1,
        department: 'Computer Engineering',
      },
      {
        firstName: 'Jack',
        lastName: 'Davis',
        numRatings: 2,
        legacyId: 2,
        department: 'Entrepreneurship',
      },
      {
        firstName: 'Jan',
        lastName: 'Davis',
        numRatings: 3,
        legacyId: 3,
        department: 'Nursing',
      },
    ];

    const pick = pickBestCandidate('J Davis', candidates, { course: 'CS 18000' });
    assert.equal(pick.status, 'ambiguous');
    assert.equal(pick.candidate, null);
  });

  it('prefers Computer Science over CIT when both share the same initial', () => {
    // Bare "computer" matched both "Computer Science" and
    // "Computer & Informational Tech.", then review count picked CIT.
    const candidates = [
      {
        firstName: 'Paul',
        lastName: 'Thomas',
        numRatings: 38,
        legacyId: 1,
        department: 'Computer & Informational Tech.',
      },
      {
        firstName: 'Paul',
        lastName: 'Thomas',
        numRatings: 8,
        legacyId: 2,
        department: 'Computer Science',
      },
    ];

    const pick = pickBestCandidate('P Thomas', candidates, { course: 'CS 18000' });
    assert.equal(pick.status, 'ok');
    assert.equal(pick.candidate?.department, 'Computer Science');
    assert.equal(pick.candidate?.legacyId, 2);
  });

  it('still prefers a unique Computer Science department match', () => {
    const candidates = [
      {
        firstName: 'Jane',
        lastName: 'Smith',
        numRatings: 12,
        legacyId: 1,
        department: 'Computer Science',
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        numRatings: 40,
        legacyId: 2,
        department: 'History',
      },
    ];

    const pick = pickBestCandidate('J Smith', candidates, { course: 'CS 25100' });
    assert.equal(pick.status, 'ok');
    assert.equal(pick.candidate?.department, 'Computer Science');
    assert.equal(pick.candidate?.firstName, 'Jane');
  });

  it('does not treat Physics as a CS match via substring "cs"', () => {
    const candidates = [
      {
        firstName: 'Jane',
        lastName: 'Smith',
        numRatings: 40,
        legacyId: 1,
        department: 'Physics',
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        numRatings: 15,
        legacyId: 2,
        department: 'Computer Science',
      },
    ];

    const pick = pickBestCandidate('J Smith', candidates, { course: 'CS 18000' });
    assert.equal(pick.status, 'ok');
    assert.equal(pick.candidate?.firstName, 'John');
    assert.equal(pick.candidate?.department, 'Computer Science');
  });

  it('does not treat Computer & Informational Tech. as a CS department hit', () => {
    const candidates = [
      {
        firstName: 'Anthony',
        lastName: 'Smith',
        numRatings: 1,
        legacyId: 1,
        department: 'Computer & Informational Tech.',
      },
      {
        firstName: 'Amanda',
        lastName: 'Smith',
        numRatings: 16,
        legacyId: 2,
        department: 'English',
      },
    ];

    const pick = pickBestCandidate('A Smith', candidates, { course: 'CS 18000' });
    // No unique CS dept hint — must not select CIT via bare "computer".
    assert.notEqual(pick.candidate?.department, 'Computer & Informational Tech.');
  });
});
