import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickBestCandidate, departmentHintsFromCourse } from '../src/core/matching.js';

describe('MGMT / BIOL / ME / ECE department hints avoid polytechnic false matches', () => {
  it('uses exact management hints (not bare substring management/mgmt)', () => {
    assert.deepEqual(departmentHintsFromCourse('MGMT 30400'), [
      '=management',
      'organization management',
    ]);
  });

  it('uses biology phrases without bare biol', () => {
    assert.deepEqual(departmentHintsFromCourse('BIOL 11000'), [
      'biology',
      'biological sciences',
    ]);
  });

  it('does not uniquely prefer Hospitality and Tourism Management on MGMT courses', () => {
    // Bare "management" made HTM the unique department hit over Finance /
    // Organizational Behavior faculty who also teach MGMT sections.
    const candidates = [
      {
        firstName: 'Sarah',
        lastName: 'Kim',
        numRatings: 40,
        legacyId: 1,
        department: 'Hospitality and Tourism Management',
      },
      {
        firstName: 'Sam',
        lastName: 'Kim',
        numRatings: 25,
        legacyId: 2,
        department: 'Organizational Behavior and Human Resources',
      },
    ];

    const pick = pickBestCandidate('S Kim', candidates, { course: 'MGMT 30400' });
    assert.equal(pick.status, 'ambiguous');
    assert.equal(pick.candidate, null);
  });

  it('does not uniquely prefer Construction Management Technology on MGMT courses', () => {
    // With bare "management", CMT is the unique dept hit and wins even with
    // fewer reviews than the Finance rival once popularity is close.
    const candidates = [
      {
        firstName: 'Sarah',
        lastName: 'Kim',
        numRatings: 18,
        legacyId: 1,
        department: 'Construction Management Technology',
      },
      {
        firstName: 'Sam',
        lastName: 'Kim',
        numRatings: 22,
        legacyId: 2,
        department: 'Finance',
      },
    ];

    const pick = pickBestCandidate('S Kim', candidates, { course: 'MGMT 20100' });
    assert.equal(pick.status, 'ambiguous');
    assert.equal(pick.candidate, null);
  });

  it('still prefers a unique Management department match on MGMT courses', () => {
    const candidates = [
      {
        firstName: 'Jane',
        lastName: 'Smith',
        numRatings: 12,
        legacyId: 1,
        department: 'Management',
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        numRatings: 40,
        legacyId: 2,
        department: 'History',
      },
    ];

    const pick = pickBestCandidate('J Smith', candidates, { course: 'MGMT 20100' });
    assert.equal(pick.status, 'ok');
    assert.equal(pick.candidate?.department, 'Management');
    assert.equal(pick.candidate?.firstName, 'Jane');
  });

  it('still matches Organization Management as an MGMT department', () => {
    const candidates = [
      {
        firstName: 'Jane',
        lastName: 'Smith',
        numRatings: 8,
        legacyId: 1,
        department: 'Organization Management',
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        numRatings: 30,
        legacyId: 2,
        department: 'Economics',
      },
    ];

    const pick = pickBestCandidate('J Smith', candidates, { course: 'MGMT 30400' });
    assert.equal(pick.status, 'ok');
    assert.equal(pick.candidate?.department, 'Organization Management');
  });

  it('does not uniquely prefer Agricultural and Biological Engineering on BIOL courses', () => {
    // Bare "biol" matched ABE over Biochemistry (which does not contain "biol").
    const candidates = [
      {
        firstName: 'Mark',
        lastName: 'Hall',
        numRatings: 15,
        legacyId: 1,
        department: 'Agricultural and Biological Engineering',
      },
      {
        firstName: 'Mary',
        lastName: 'Hall',
        numRatings: 18,
        legacyId: 2,
        department: 'Biochemistry',
      },
    ];

    const pick = pickBestCandidate('M Hall', candidates, { course: 'BIOL 11000' });
    assert.equal(pick.status, 'ambiguous');
    assert.equal(pick.candidate, null);
  });

  it('still prefers Biology / Biological Sciences on BIOL courses', () => {
    const candidates = [
      {
        firstName: 'Jane',
        lastName: 'Smith',
        numRatings: 10,
        legacyId: 1,
        department: 'Biological Sciences',
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        numRatings: 40,
        legacyId: 2,
        department: 'Physics',
      },
    ];

    const pick = pickBestCandidate('J Smith', candidates, { course: 'BIOL 20300' });
    assert.equal(pick.status, 'ok');
    assert.equal(pick.candidate?.department, 'Biological Sciences');
  });

  it('does not uniquely prefer Mechanical Engineering Technology on ME courses', () => {
    const candidates = [
      {
        firstName: 'Jane',
        lastName: 'Smith',
        numRatings: 20,
        legacyId: 1,
        department: 'Mechanical Engineering Technology',
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        numRatings: 22,
        legacyId: 2,
        department: 'Engineering Education',
      },
    ];

    const pick = pickBestCandidate('J Smith', candidates, { course: 'ME 20000' });
    assert.equal(pick.status, 'ambiguous');
    assert.equal(pick.candidate, null);
  });

  it('still prefers Mechanical Engineering on ME courses', () => {
    const candidates = [
      {
        firstName: 'Jane',
        lastName: 'Smith',
        numRatings: 8,
        legacyId: 1,
        department: 'Mechanical Engineering',
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        numRatings: 40,
        legacyId: 2,
        department: 'Physics',
      },
    ];

    const pick = pickBestCandidate('J Smith', candidates, { course: 'ME 27000' });
    assert.equal(pick.status, 'ok');
    assert.equal(pick.candidate?.department, 'Mechanical Engineering');
  });

  it('does not uniquely prefer Electrical Engineering Technology on ECE courses', () => {
    const candidates = [
      {
        firstName: 'Jane',
        lastName: 'Smith',
        numRatings: 20,
        legacyId: 1,
        department: 'Electrical Engineering Technology',
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        numRatings: 22,
        legacyId: 2,
        department: 'Physics',
      },
    ];

    const pick = pickBestCandidate('J Smith', candidates, { course: 'ECE 20001' });
    assert.equal(pick.status, 'ambiguous');
    assert.equal(pick.candidate, null);
  });
});
