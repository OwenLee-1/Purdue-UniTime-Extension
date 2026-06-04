// The "eyes" of the on-page helper.
//
// UniTime's "List of Classes" table has a header row with an "Instructor" column
// (confirmed via discovery on timetable.mypurdue.purdue.edu). Data rows use
// td[role="gridcell"]. We find columns by header index, not by guessing CSS.
//
// Discovery note: many sections (especially math) use a full-width row (18 cells)
// plus spillover continuation rows (often 2 cells: blank + instructor name only).
// We must carry course context forward and still badge spillover rows.

import { normalizeCourseKey } from '../core/courseKey.js';

const PROCESSED_ATTR = 'data-rmp-seen';

/** Headers that identify a schedule table (List of Classes or Alternatives dialog). */
const SCHEDULE_MARKERS = ['Instructor', 'CRN-SectionId'];

/** Full class rows have ~18 gridcells; spillover rows are shorter. */
const MIN_CLASS_ROW_CELLS = 8;

/** UniTime section types and other tokens that are not instructor names. */
const NON_INSTRUCTOR_TOKENS = new Set([
  'lec',
  'lab',
  'rec',
  'dist',
  'ind',
  'arr',
  'hyb',
  'online',
  'staff',
  'tba',
  'tbd',
  'arranged',
  'distance',
  'hybrid',
]);

/**
 * @typedef {Object} InstructorCandidate
 * @property {string} text
 * @property {Element} element
 * @property {Element} rowElement
 * @property {string} [courseContext]
 */

/**
 * @param {HTMLTableElement} table
 * @returns {string[]}
 */
function getHeaderLabels(table) {
  return Array.from(table.querySelectorAll('.unitime-TableHeader')).map((h) =>
    (h.textContent || '').trim()
  );
}

/**
 * @param {HTMLTableElement} table
 * @param {string} label
 * @returns {number}
 */
function getColumnIndex(table, label) {
  return getHeaderLabels(table).indexOf(label);
}

/**
 * @returns {HTMLTableElement[]}
 */
function findScheduleTables() {
  return Array.from(document.querySelectorAll('table')).filter((table) => {
    const headers = getHeaderLabels(table);
    return SCHEDULE_MARKERS.every((marker) => headers.includes(marker));
  });
}

/**
 * @param {string} text
 */
function looksLikeInstructorName(text) {
  const t = text.trim();
  if (t.length < 3 || t.length > 80) return false;
  if (!/[a-zA-Z]/.test(t)) return false;
  if (!/^[a-zA-Z][a-zA-Z.'\-\s,]+$/.test(t)) return false;

  const lower = t.toLowerCase();
  if (NON_INSTRUCTOR_TOKENS.has(lower)) return false;

  // Real instructors are "S Weng", "D L Johnstone", or "Last, First" — not lone section types.
  if (!t.includes(' ') && !t.includes(',')) return false;

  return true;
}

/**
 * @param {string} text
 * @returns {string}
 */
function primaryInstructorText(text) {
  const parts = String(text || '')
    .split(/[;\n]/)
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    if (looksLikeInstructorName(part)) return part;
  }
  return (parts[0] || text).trim();
}

/**
 * @param {string} raw
 * @returns {string}
 */
function normalizeCourseNumber(raw) {
  const t = String(raw || '').trim();
  const m = t.match(/^(\d{3,5})/);
  return m ? m[1] : t;
}

/**
 * @param {Element} row
 * @param {number} subjectIdx
 * @param {number} courseIdx
 * @param {string} lastSubject
 * @param {string} lastNumber
 */
function readCourseFromRow(row, subjectIdx, courseIdx, lastSubject, lastNumber) {
  const cells = Array.from(row.querySelectorAll('td[role="gridcell"]'));
  const maxIdx = Math.max(subjectIdx, courseIdx);
  if (cells.length <= maxIdx) {
    return {
      courseContext: lastSubject && lastNumber ? `${lastSubject} ${lastNumber}` : '',
      lastSubject,
      lastNumber,
    };
  }

  const subjectRaw = (cells[subjectIdx]?.textContent || '').trim();
  const numberRaw = (cells[courseIdx]?.textContent || '').trim();
  const subject = subjectRaw || lastSubject;
  const number = normalizeCourseNumber(numberRaw || lastNumber);

  const nextLastSubject = subjectRaw || lastSubject;
  const nextLastNumber = numberRaw ? normalizeCourseNumber(numberRaw) : lastNumber;
  const courseContext = subject && number ? `${subject} ${number}` : '';

  return { courseContext, lastSubject: nextLastSubject, lastNumber: nextLastNumber };
}

/**
 * @param {NodeListOf<Element>} cells
 * @param {number} instructorIdx
 * @param {{ spillover?: boolean }} [opts]
 * @returns {{ cell: Element, text: string } | null}
 */
function findInstructorOnRow(cells, instructorIdx, opts = {}) {
  if (cells.length > instructorIdx) {
    const text = primaryInstructorText((cells[instructorIdx].textContent || '').trim());
    if (looksLikeInstructorName(text)) {
      return { cell: cells[instructorIdx], text };
    }
  }

  // Full rows: never scan other columns (avoids badging "Lec" in the Type column).
  if (!opts.spillover) return null;

  for (const cell of cells) {
    const text = primaryInstructorText((cell.textContent || '').trim());
    if (looksLikeInstructorName(text)) return { cell, text };
  }
  return null;
}

/**
 * @param {(candidate: InstructorCandidate) => void} onFound
 */
function scanOnce(onFound) {
  for (const table of findScheduleTables()) {
    const instructorIdx = getColumnIndex(table, 'Instructor');
    if (instructorIdx < 0) continue;

    const subjectIdx = getColumnIndex(table, 'Subject');
    const courseIdx = getColumnIndex(table, 'Course');
    const useSubjectIdx = subjectIdx >= 0 ? subjectIdx : 1;
    const useCourseIdx = courseIdx >= 0 ? courseIdx : 2;

    const rows = table.querySelectorAll('tr[role="row"]');
    let lastSubject = '';
    let lastNumber = '';

    for (const row of rows) {
      if (row.querySelector('.unitime-TableHeader')) continue;

      const cells = row.querySelectorAll('td[role="gridcell"]');
      if (!cells.length) continue;

      const { courseContext, lastSubject: ls, lastNumber: ln } = readCourseFromRow(
        row,
        useSubjectIdx,
        useCourseIdx,
        lastSubject,
        lastNumber
      );
      lastSubject = ls;
      lastNumber = ln;

      const isFullRow = cells.length >= MIN_CLASS_ROW_CELLS && cells.length > instructorIdx;
      const isSpillover = !isFullRow && courseContext;

      if (!isFullRow && !isSpillover) continue;

      const hit = findInstructorOnRow(cells, instructorIdx, { spillover: isSpillover });
      if (!hit) continue;

      const { cell, text } = hit;

      const existingHost = cell.querySelector('.rmp-badge-host');
      if (cell.hasAttribute(PROCESSED_ATTR) && existingHost) continue;
      if (existingHost) continue;

      cell.setAttribute(PROCESSED_ATTR, 'true');
      onFound({
        text,
        element: cell,
        rowElement: row,
        courseContext: normalizeCourseKey(courseContext) || courseContext,
      });
    }
  }
}

/**
 * @param {(candidate: InstructorCandidate) => void} onFound
 * @returns {() => void}
 */
export function startDetector(onFound) {
  scanOnce(onFound);

  let timer = null;
  const observer = new MutationObserver(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => scanOnce(onFound), 300);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    if (timer) clearTimeout(timer);
  };
}

/**
 * @param {Record<string, { rawName: string }>} blocksMap
 * @param {(rawName: string) => string} keyFor
 */
export function applyBlockVisibility(blocksMap, keyFor) {
  for (const table of findScheduleTables()) {
    const instructorIdx = getColumnIndex(table, 'Instructor');
    if (instructorIdx < 0) continue;

    const rows = table.querySelectorAll('tr[role="row"]');
    for (const row of rows) {
      if (row.querySelector('.unitime-TableHeader')) continue;
      const cells = row.querySelectorAll('td[role="gridcell"]');
      if (!cells.length) continue;

      const isFullRow =
        cells.length >= MIN_CLASS_ROW_CELLS && cells.length > instructorIdx;
      const hit = findInstructorOnRow(cells, instructorIdx, { spillover: !isFullRow });
      if (!hit) continue;

      const key = keyFor(hit.text);
      if (key && blocksMap[key]) {
        row.style.display = 'none';
        row.dataset.rmpBlocked = '1';
      } else if (row.dataset.rmpBlocked === '1') {
        row.style.display = '';
        delete row.dataset.rmpBlocked;
      }
    }
  }
}

export { PROCESSED_ATTR };
