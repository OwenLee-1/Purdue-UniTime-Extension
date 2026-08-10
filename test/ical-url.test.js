import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { looksLikeIcalUrl, normalizeIcalUrl } from '../src/core/icalUrl.js';

const TOKEN =
  'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

describe('looksLikeIcalUrl', () => {
  it('accepts UniTime Personal Schedule iCalendar export URLs (output=events.ics)', () => {
    const url =
      `https://timetable.mypurdue.purdue.edu/Timetabling/export?token=${TOKEN}&output=events.ics&e:flag=All+Sessions`;
    assert.equal(looksLikeIcalUrl(url), true);
  });

  it('accepts classic ical / icalendar / calendar.ics markers', () => {
    assert.equal(
      looksLikeIcalUrl(
        `https://timetable.mypurdue.purdue.edu/Timetabling/export?output=ical&token=${TOKEN}`
      ),
      true
    );
    assert.equal(
      looksLikeIcalUrl(
        `https://timetable.mypurdue.purdue.edu/Timetabling/export?type=icalendar&token=${TOKEN}`
      ),
      true
    );
    assert.equal(
      looksLikeIcalUrl(
        'https://timetable.mypurdue.purdue.edu/Timetabling/calendar.ics?token=abc'
      ),
      true
    );
  });

  it('accepts Student Scheduling Assistant /calendar?sid=&cid= feeds', () => {
    assert.equal(
      looksLikeIcalUrl(
        'https://timetable.mypurdue.purdue.edu/Timetabling/calendar?sid=123&cid=456-789,'
      ),
      true
    );
  });

  it('rejects UniTime non-iCal export formats that share /export?output=', () => {
    const base = `https://timetable.mypurdue.purdue.edu/Timetabling/export?token=${TOKEN}&output=`;
    for (const format of [
      'events.csv',
      'meetings.csv',
      'events.pdf',
      'meetings.pdf',
      'events.xls',
      'meetings.xls',
      'events.json',
      'xml',
      'csv',
      'json',
    ]) {
      assert.equal(
        looksLikeIcalUrl(base + format),
        false,
        `should reject output=${format}`
      );
    }
  });

  it('rejects long tokenized /export URLs without an iCal marker', () => {
    const url =
      `https://timetable.mypurdue.purdue.edu/Timetabling/export?type=csv&token=${TOKEN}`;
    assert.ok(url.length >= 72);
    assert.equal(looksLikeIcalUrl(url), false);
  });

  it('rejects non-Purdue hosts and non-URLs', () => {
    assert.equal(
      looksLikeIcalUrl('https://example.com/export?output=events.ics'),
      false
    );
    assert.equal(looksLikeIcalUrl('not-a-url'), false);
    assert.equal(looksLikeIcalUrl(''), false);
  });

  it('normalizes quotes/whitespace before matching', () => {
    const raw =
      `  "https://timetable.mypurdue.purdue.edu/Timetabling/export?output=events.ics&token=${TOKEN}"  `;
    assert.equal(looksLikeIcalUrl(normalizeIcalUrl(raw)), true);
    assert.equal(looksLikeIcalUrl(raw), true);
  });
});
