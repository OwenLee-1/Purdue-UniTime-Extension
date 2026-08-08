import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCourseRmpSnapshot,
  courseMatchesRmpClass,
} from '../src/core/courseRmpFilter.js';

describe('courseMatchesRmpClass', () => {
  it('matches same-department short and full course tags', () => {
    assert.equal(courseMatchesRmpClass('CS 18000', 'CS 180'), true);
    assert.equal(courseMatchesRmpClass('CS 18000', 'CS180'), true);
    assert.equal(courseMatchesRmpClass('CS 18000', 'COMPUTER SCIENCE 180'), true);
    assert.equal(courseMatchesRmpClass('CS 18000', 'COMPUTER 180'), true);
    assert.equal(courseMatchesRmpClass('MA 26100', 'MATH 261'), true);
    assert.equal(courseMatchesRmpClass('MA 26100', 'MA 26100'), true);
    assert.equal(courseMatchesRmpClass('ME 20000', 'MECHANICAL ENGINEERING 200'), true);
    assert.equal(courseMatchesRmpClass('BIOL 11000', 'BIOLOGY 110'), true);
    assert.equal(courseMatchesRmpClass('CHM 11500', 'CHEMISTRY 115'), true);
  });

  it('rejects other-department multi-word class tags that share a bare word', () => {
    assert.equal(courseMatchesRmpClass('CS 18000', 'COMPUTER ENGINEERING 180'), false);
    assert.equal(courseMatchesRmpClass('CS 18000', 'COMPUTER GRAPHICS 180'), false);
    assert.equal(courseMatchesRmpClass('ME 20000', 'MECHANICAL ENGINEERING TECHNOLOGY 200'), false);
    assert.equal(courseMatchesRmpClass('ECE 20100', 'ELECTRICAL ENGINEERING TECHNOLOGY 201'), false);
    assert.equal(courseMatchesRmpClass('MGMT 20000', 'HOSPITALITY AND TOURISM MANAGEMENT 200'), false);
    assert.equal(courseMatchesRmpClass('ENGR 13100', 'MECHANICAL ENGINEERING 131'), false);
    assert.equal(courseMatchesRmpClass('AD 10500', 'INDUSTRIAL DESIGN 105'), false);
    assert.equal(courseMatchesRmpClass('IE 33000', 'INDUSTRIAL DESIGN 330'), false);
    assert.equal(courseMatchesRmpClass('CHM 11500', 'BIOCHEMISTRY 115'), false);
  });

  it('does not bridge 5-digit Purdue numbers through 4-digit lookalikes', () => {
    assert.equal(courseMatchesRmpClass('CS 18000', 'CS 1800'), false);
    assert.equal(courseMatchesRmpClass('MA 26100', 'MATH 2610'), false);
  });

  it('rejects number-only class tags', () => {
    assert.equal(courseMatchesRmpClass('MA 26100', '261'), false);
    assert.equal(courseMatchesRmpClass('CS 18000', '18000'), false);
  });
});

describe('buildCourseRmpSnapshot', () => {
  it('does not let CompE reviews pollute CS course-scoped averages', () => {
    const snap = buildCourseRmpSnapshot(
      'CS 18000',
      [
        { class: 'COMPUTER ENGINEERING 180', quality: 1, difficulty: 5, comment: 'a' },
        { class: 'COMPUTER ENGINEERING 180', quality: 1, difficulty: 5, comment: 'b' },
        { class: 'COMPUTER ENGINEERING 180', quality: 2, difficulty: 4, comment: 'c' },
        { class: 'CS 180', quality: 5, difficulty: 3, comment: 'd' },
        { class: 'CS 180', quality: 5, difficulty: 3, comment: 'e' },
        { class: 'COMPUTER SCIENCE 180', quality: 5, difficulty: 2, comment: 'f' },
      ],
      []
    );

    assert.ok(snap);
    assert.equal(snap.sampleSize, 3);
    assert.equal(snap.hasEnoughForAverage, true);
    assert.equal(snap.overall, 5);
  });
});
