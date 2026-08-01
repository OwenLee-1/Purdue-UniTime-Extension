import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GradesProvider, resolveGradeRecord } from '../src/core/providers/gradesProvider.js';
import { pickBestCandidate } from '../src/core/matching.js';

describe('resolveGradeRecord first-name disambiguation', () => {
  const byCourse = {
    // Unique last name: bare + person key
    smith: { gpa: 3.1, n: 2 },
    'smith:john': { gpa: 3.1, n: 2 },
    // Shared last name: person keys only (no blended `li`)
    'li:haitong': { gpa: 3.28, n: 2 },
    'li:tongcang': { gpa: 2.66, n: 1 },
  };

  it('returns distinct GPAs for shared last names with full first names', () => {
    assert.equal(resolveGradeRecord(byCourse, 'li', 'haitong')?.rec.gpa, 3.28);
    assert.equal(resolveGradeRecord(byCourse, 'li', 'tongcang')?.rec.gpa, 2.66);
  });

  it('refuses last-name-only lookup when the last name is shared', () => {
    assert.equal(resolveGradeRecord(byCourse, 'li', ''), null);
  });

  it('resolves a unique initial when only one first name matches', () => {
    assert.equal(resolveGradeRecord(byCourse, 'li', 'h')?.rec.gpa, 3.28);
    assert.equal(resolveGradeRecord(byCourse, 'li', 't')?.rec.gpa, 2.66);
  });

  it('refuses ambiguous initials for shared last names', () => {
    const ambiguous = {
      'wang:yi': { gpa: 2.8, n: 1 },
      'wang:yueqi': { gpa: 2.5, n: 1 },
    };
    assert.equal(resolveGradeRecord(ambiguous, 'wang', 'y'), null);
  });

  it('does not attribute a unique last-name GPA to a different full first name', () => {
    assert.equal(resolveGradeRecord(byCourse, 'smith', 'john')?.rec.gpa, 3.1);
    assert.equal(resolveGradeRecord(byCourse, 'smith', 'jane'), null);
  });

  it('allows last-name-only lookup for unique last names', () => {
    assert.equal(resolveGradeRecord(byCourse, 'smith', '')?.rec.gpa, 3.1);
  });
});

describe('GradesProvider against bundled BoilerGrades data', () => {
  const provider = new GradesProvider();

  it('does not blend Haitong Li and Tongcang Li on ECE 30500', async () => {
    const haitong = await provider.lookup({
      rawName: 'Li, Haitong',
      course: 'ECE 30500',
    });
    const tongcang = await provider.lookup({
      rawName: 'Li, Tongcang',
      course: 'ECE 30500',
    });
    const bare = await provider.lookup({
      rawName: 'Li',
      course: 'ECE 30500',
    });

    assert.equal(haitong.status, 'ok');
    assert.equal(tongcang.status, 'ok');
    assert.equal(haitong.gpa, 3.28);
    assert.equal(tongcang.gpa, 2.66);
    assert.notEqual(haitong.gpa, tongcang.gpa);
    // Shared last name with no first name must not return a blended GPA.
    assert.equal(bare.status, 'no_match');
  });

  it('does not blend Lyuzhou Chen and Ying Chen on MA 35100', async () => {
    const lyuzhou = await provider.lookup({
      rawName: 'Chen, Lyuzhou',
      course: 'MA 35100',
    });
    const ying = await provider.lookup({
      rawName: 'Chen, Ying',
      course: 'MA 35100',
    });

    assert.equal(lyuzhou.status, 'ok');
    assert.equal(ying.status, 'ok');
    assert.equal(lyuzhou.gpa, 3.55);
    assert.equal(ying.gpa, 2.72);
  });
});

describe('ECON department hints do not match ESL', () => {
  it('prefers Economics over English As A Second Language for J Smith', () => {
    const candidates = [
      {
        firstName: 'Jane',
        lastName: 'Smith',
        numRatings: 40,
        legacyId: 1,
        department: 'English As A Second Language',
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        numRatings: 15,
        legacyId: 2,
        department: 'Economics',
      },
    ];

    const result = pickBestCandidate('J Smith', candidates, { course: 'ECON 25100' });
    assert.equal(result.status, 'ok');
    assert.equal(result.candidate?.firstName, 'John');
    assert.equal(result.candidate?.department, 'Economics');
  });
});
