import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { departmentHintsFromCourse, pickBestCandidate } from '../src/core/matching.js';

describe('Purdue subject department hints', () => {
  it('maps CHM (UniTime chemistry) to chemistry hints', () => {
    assert.deepEqual(departmentHintsFromCourse('CHM 25500'), ['chemistry']);
    assert.deepEqual(departmentHintsFromCourse('CHEM 25500'), ['chemistry']);
  });

  it('picks Chemistry over a more-reviewed Physics rival on CHM courses', () => {
    const result = pickBestCandidate(
      'J Liu',
      [
        {
          firstName: 'Jing',
          lastName: 'Liu',
          numRatings: 4,
          legacyId: 1,
          department: 'Chemistry',
        },
        {
          firstName: 'Jian',
          lastName: 'Liu',
          numRatings: 25,
          legacyId: 2,
          department: 'Physics',
        },
      ],
      { course: 'CHM 25500' }
    );

    assert.equal(result.status, 'ok');
    assert.equal(result.candidate?.firstName, 'Jing');
    assert.equal(result.candidate?.department, 'Chemistry');
  });

  it('does not treat Chemical Engineering as a Chemistry match via substring chem', () => {
    const result = pickBestCandidate(
      'J Chen',
      [
        {
          firstName: 'Jing',
          lastName: 'Chen',
          numRatings: 6,
          legacyId: 1,
          department: 'Chemistry',
        },
        {
          firstName: 'Jian',
          lastName: 'Chen',
          numRatings: 30,
          legacyId: 2,
          department: 'Chemical Engineering',
        },
      ],
      { course: 'CHM 25500' }
    );

    assert.equal(result.status, 'ok');
    assert.equal(result.candidate?.firstName, 'Jing');
    assert.equal(result.candidate?.department, 'Chemistry');
  });

  it('does not treat Physical Education as a Physics match via substring phys', () => {
    const result = pickBestCandidate(
      'J Smith',
      [
        {
          firstName: 'Jane',
          lastName: 'Smith',
          numRatings: 8,
          legacyId: 1,
          department: 'Physics',
        },
        {
          firstName: 'John',
          lastName: 'Smith',
          numRatings: 40,
          legacyId: 2,
          department: 'Physical Education',
        },
      ],
      { course: 'PHYS 17200' }
    );

    assert.equal(result.status, 'ok');
    assert.equal(result.candidate?.firstName, 'Jane');
    assert.equal(result.candidate?.department, 'Physics');
  });

  it('does not treat Earth Sciences as an Art & Design match via substring art', () => {
    const result = pickBestCandidate(
      'J Smith',
      [
        {
          firstName: 'Jane',
          lastName: 'Smith',
          numRatings: 5,
          legacyId: 1,
          department: 'Art & Design',
        },
        {
          firstName: 'John',
          lastName: 'Smith',
          numRatings: 40,
          legacyId: 2,
          department: 'Earth and Atmospheric Sciences',
        },
      ],
      { course: 'AD 10500' }
    );

    assert.equal(result.status, 'ok');
    assert.equal(result.candidate?.firstName, 'Jane');
    assert.equal(result.candidate?.department, 'Art & Design');
  });
});
