import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickBestCandidate } from '../src/core/matching.js';
import {
  TEACHER_SEARCH_PAGE_SIZE,
  TEACHER_SEARCH_QUERY,
} from '../src/core/providers/rmpProvider.js';

describe('RMP teacher search page size', () => {
  it('requests a large teachers page so common last names are not truncated', () => {
    assert.equal(TEACHER_SEARCH_PAGE_SIZE, 200);
    assert.match(TEACHER_SEARCH_QUERY, /query TeacherSearch\(\$text: String!, \$schoolID: ID!, \$first: Int\)/);
    assert.match(
      TEACHER_SEARCH_QUERY,
      /teachers\(query: \{ text: \$text, schoolID: \$schoolID \}, first: \$first\)/
    );
  });
});

describe('truncated RMP search unique-match bug', () => {
  // Live Purdue RMP (2026-08-23): last-name search "Wang" without `first`
  // returns ~8–10 teachers. Changyou is on that first page; Chih-Chun is not.
  const changyou = {
    firstName: 'Changyou',
    lastName: 'Wang',
    department: 'Mathematics',
    numRatings: 6,
    legacyId: 1001,
  };
  const chihChun = {
    firstName: 'Chih-Chun',
    lastName: 'Wang',
    department: 'Electrical Engineering',
    numRatings: 34,
    legacyId: 1002,
  };

  it('attributes the only same-initial Wang on a truncated page (the bug)', () => {
    const truncated = pickBestCandidate('C Wang', [changyou], { course: 'ECE 30500' });
    assert.equal(truncated.status, 'ok');
    assert.equal(truncated.candidate?.legacyId, changyou.legacyId);
  });

  it('picks Chih-Chun Wang for ECE once both C Wangs are in the candidate list', () => {
    const full = pickBestCandidate('C Wang', [changyou, chihChun], { course: 'ECE 30500' });
    assert.equal(full.status, 'ok');
    assert.equal(full.candidate?.legacyId, chihChun.legacyId);
  });

  it('also recovers Last, Initial UniTime formatting', () => {
    const full = pickBestCandidate('Wang, C', [changyou, chihChun], { course: 'ECE 30500' });
    assert.equal(full.status, 'ok');
    assert.equal(full.candidate?.legacyId, chihChun.legacyId);
  });
});
