import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickBestCandidate } from '../src/core/matching.js';
import { rmpCacheIdentityKey, rmpIdentityNeedsCourse } from '../src/core/rmpIdentity.js';

const wangCandidates = [
  {
    firstName: 'Hongjian',
    lastName: 'Wang',
    department: 'Chinese',
    numRatings: 4,
    legacyId: 2575211,
  },
  {
    firstName: 'Haifeng',
    lastName: 'Wang',
    department: 'Aerospace Engineering',
    numRatings: 16,
    legacyId: 2284190,
  },
  {
    firstName: 'Xing',
    lastName: 'Wang',
    department: 'Management',
    numRatings: 19,
    legacyId: 3009590,
  },
  {
    firstName: 'Xiaoqian',
    lastName: 'Wang',
    department: 'Electrical Engineering',
    numRatings: 14,
    legacyId: 2626413,
  },
];

describe('initial-only RMP disambiguation', () => {
  it('does not pick the more-reviewed H Wang when the course has no unique dept signal', () => {
    // Pre-fix: Haifeng (Aerospace, 16 ratings) beat Hongjian (Chinese, 4) via popularity.
    const withoutCourse = pickBestCandidate('H Wang', wangCandidates, {});
    assert.equal(withoutCourse.status, 'ambiguous');
    assert.equal(withoutCourse.candidate, null);
  });

  it('prefers Chinese H Wang for CHNS courses via department hints', () => {
    const result = pickBestCandidate('H Wang', wangCandidates, { course: 'CHNS 33000' });
    assert.equal(result.status, 'ok');
    assert.equal(result.candidate?.firstName, 'Hongjian');
    assert.equal(result.candidate?.department, 'Chinese');
  });

  it('prefers Aerospace H Wang for AAE courses via department hints', () => {
    const result = pickBestCandidate('H Wang', wangCandidates, { course: 'AAE 33400' });
    assert.equal(result.status, 'ok');
    assert.equal(result.candidate?.firstName, 'Haifeng');
  });

  it('prefers Management vs ECE X Wang by course department, not shared identity', () => {
    const mgmt = pickBestCandidate('X Wang', wangCandidates, { course: 'MGMT 30600' });
    const ece = pickBestCandidate('X Wang', wangCandidates, { course: 'ECE 47300' });
    assert.equal(mgmt.status, 'ok');
    assert.equal(mgmt.candidate?.firstName, 'Xing');
    assert.equal(ece.status, 'ok');
    assert.equal(ece.candidate?.firstName, 'Xiaoqian');
  });

  it('never breaks equal full-name ties by review popularity either', () => {
    const result = pickBestCandidate(
      'Alex Kim',
      [
        { firstName: 'Alex', lastName: 'Kim', numRatings: 40, legacyId: 1, department: 'History' },
        { firstName: 'Alex', lastName: 'Kim', numRatings: 12, legacyId: 2, department: 'Physics' },
      ],
      { course: 'ENGL 10600' }
    );
    assert.equal(result.status, 'ambiguous');
    assert.equal(result.candidate, null);
  });
});

describe('course-scoped RMP cache identity for initials', () => {
  it('marks initial-only UniTime names as needing course in the RMP identity', () => {
    assert.equal(rmpIdentityNeedsCourse('H Wang'), true);
    assert.equal(rmpIdentityNeedsCourse('P P Cunningham'), true);
    assert.equal(rmpIdentityNeedsCourse('Hongjian Wang'), false);
  });

  it('uses distinct cache keys for the same initial across courses', () => {
    const mgmt = rmpCacheIdentityKey({ rawName: 'X Wang', course: 'MGMT 30600' });
    const ece = rmpCacheIdentityKey({ rawName: 'X Wang', course: 'ECE 47300' });
    assert.equal(mgmt, 'purdue:wang:x::MGMT 30600');
    assert.equal(ece, 'purdue:wang:x::ECE 47300');
    assert.notEqual(mgmt, ece);
  });

  it('keeps full-name RMP identity shared across courses', () => {
    const a = rmpCacheIdentityKey({ rawName: 'Hongjian Wang', course: 'CHNS 33000' });
    const b = rmpCacheIdentityKey({ rawName: 'Hongjian Wang', course: 'CHNS 10100' });
    assert.equal(a, 'purdue:wang:hongjian');
    assert.equal(a, b);
  });
});
