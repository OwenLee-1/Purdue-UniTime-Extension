import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { primaryInstructorText } from '../src/content/detector.js';
import { normalizeName } from '../src/core/matching.js';
import { GradesProvider } from '../src/core/providers/gradesProvider.js';

describe('UniTime multi-instructor cells', () => {
  it('keeps a single initial-last name', () => {
    assert.equal(primaryInstructorText('S Weng'), 'S Weng');
    assert.equal(primaryInstructorText('D L Johnstone'), 'D L Johnstone');
  });

  it('keeps Last, First as one person', () => {
    assert.equal(primaryInstructorText('Doe, Jane M.'), 'Doe, Jane M.');
    assert.equal(primaryInstructorText('Weng, S'), 'Weng, S');
    assert.deepEqual(normalizeName(primaryInstructorText('Doe, Jane M.')), {
      first: 'jane',
      last: 'doe',
      isPlaceholder: false,
    });
  });

  it('uses the first person when UniTime joins initial-last names with a comma', () => {
    assert.equal(primaryInstructorText('C Sen, J Smith'), 'C Sen');
    assert.equal(primaryInstructorText('C Sen,\u00a0J Smith'), 'C Sen');
    assert.equal(primaryInstructorText('D L Johnstone, S Weng'), 'D L Johnstone');
    assert.equal(primaryInstructorText('S Weng, J Smith, A Lee'), 'S Weng');
    assert.equal(primaryInstructorText('C Sen, Staff'), 'C Sen');
  });

  it('pairs repeated Last, First instructors instead of stopping at the first comma', () => {
    assert.equal(primaryInstructorText('Weng, S, Smith, J'), 'Weng, S');
    assert.equal(primaryInstructorText('Doe, Jane M., Smith, John'), 'Doe, Jane M.');
    assert.deepEqual(normalizeName(primaryInstructorText('Weng, S, Smith, J')), {
      first: 's',
      last: 'weng',
      isPlaceholder: false,
    });
  });

  it('does not smash the first initial into the last name', () => {
    const raw = 'C Sen, J Smith';
    assert.deepEqual(normalizeName(raw), {
      first: 'j',
      last: 'csen',
      isPlaceholder: false,
    });
    assert.deepEqual(normalizeName(primaryInstructorText(raw)), {
      first: 'c',
      last: 'sen',
      isPlaceholder: false,
    });
  });

  it('looks up the first instructor instead of a one-edit neighbor', async () => {
    const grades = new GradesProvider();
    const course = 'CHM 25601';
    const cell = 'C Sen, J Smith';
    const shown = await grades.lookup({
      rawName: primaryInstructorText(cell),
      course,
    });
    const sen = await grades.lookup({ rawName: 'C Sen', course });
    const smashed = await grades.lookup({ rawName: cell, course });

    assert.equal(shown.status, 'ok');
    assert.equal(shown.gpa, sen.gpa);
    assert.equal(shown.confidence, 0.9);
    assert.notEqual(smashed.gpa, sen.gpa);
  });
});
