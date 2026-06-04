// The "eyes" of the on-page helper.
//
// UniTime's "List of Classes" table has a header row with an "Instructor" column
// (confirmed via discovery on timetable.mypurdue.purdue.edu). Data rows use
// td[role="gridcell"]. We find that column by header index, not by guessing CSS.

const PROCESSED_ATTR = 'data-rmp-seen';

/** Headers that identify a schedule table (List of Classes or Alternatives dialog). */
const SCHEDULE_MARKERS = ['Instructor', 'CRN-SectionId'];

/** Minimum gridcells in a row before we treat it as a real class line (skips 2-cell spillover rows). */
const MIN_CLASS_ROW_CELLS = 8;

/**
 * @typedef {Object} InstructorCandidate
 * @property {string} text
 * @property {Element} element                The instructor cell.
 * @property {Element} rowElement             The full class row (for highlighting).
 * @property {string} [courseContext]  e.g. "MA 26100" when we can read it from the row
 */

/**
 * @param {string} text
 */
function looksLikeInstructorName(text) {
  const t = text.trim();
  if (t.length < 3 || t.length > 80) return false;
  if (!/[a-zA-Z]/.test(t)) return false;
  // UniTime uses formats like "S Weng", "D L Johnstone", "Smith, John".
  return /^[a-zA-Z][a-zA-Z.'\-\s,]+$/.test(t);
}

/**
 * Tables that contain both Instructor and CRN-SectionId headers.
 * @returns {HTMLTableElement[]}
 */
function findScheduleTables() {
  return Array.from(document.querySelectorAll('table')).filter((table) => {
    const headers = Array.from(table.querySelectorAll('.unitime-TableHeader')).map((h) =>
      (h.textContent || '').trim()
    );
    return SCHEDULE_MARKERS.every((marker) => headers.includes(marker));
  });
}

/**
 * Index of the Instructor column in header order.
 * @param {HTMLTableElement} table
 * @returns {number}
 */
function getInstructorColumnIndex(table) {
  const headers = Array.from(table.querySelectorAll('.unitime-TableHeader')).map((h) =>
    (h.textContent || '').trim()
  );
  return headers.indexOf('Instructor');
}

/**
 * Try to read "MA 26100" style context from the first Subject + Course cells.
 * @param {Element} row
 */
function readCourseContext(row) {
  const cells = Array.from(row.querySelectorAll('td[role="gridcell"]'));
  if (cells.length < 3) return '';
  const subject = (cells[1]?.textContent || '').trim();
  const course = (cells[2]?.textContent || '').trim();
  if (subject && course) return `${subject} ${course}`;
  return '';
}

/**
 * @param {(candidate: InstructorCandidate) => void} onFound
 */
function scanOnce(onFound) {
  for (const table of findScheduleTables()) {
    const instructorIdx = getInstructorColumnIndex(table);
    if (instructorIdx < 0) continue;

    const rows = table.querySelectorAll('tr[role="row"]');
    let lastSubject = '';
    let lastNumber = '';
    for (const row of rows) {
      if (row.querySelector('.unitime-TableHeader')) continue;

      const cells = row.querySelectorAll('td[role="gridcell"]');
      if (cells.length < MIN_CLASS_ROW_CELLS || cells.length <= instructorIdx) continue;

      const subject = (cells[1]?.textContent || '').trim() || lastSubject;
      const number = (cells[2]?.textContent || '').trim() || lastNumber;
      if (cells[1]?.textContent?.trim()) lastSubject = subject;
      if (cells[2]?.textContent?.trim()) lastNumber = number;

      const cell = cells[instructorIdx];
      if (cell.hasAttribute(PROCESSED_ATTR)) continue;
      if (cell.querySelector('.rmp-badge-host')) continue;

      const text = (cell.textContent || '').trim();
      if (!looksLikeInstructorName(text)) continue;

      const courseContext = subject && number ? `${subject} ${number}` : readCourseContext(row);

      cell.setAttribute(PROCESSED_ATTR, 'true');
      onFound({
        text,
        element: cell,
        rowElement: row,
        courseContext,
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
 * Show/hide class rows based on the user's blocked-professor list.
 * @param {Record<string, { rawName: string }>} blocksMap
 * @param {(rawName: string) => string} keyFor  e.g. professorKey
 */
export function applyBlockVisibility(blocksMap, keyFor) {
  for (const table of findScheduleTables()) {
    const instructorIdx = getInstructorColumnIndex(table);
    if (instructorIdx < 0) continue;

    const rows = table.querySelectorAll('tr[role="row"]');
    for (const row of rows) {
      if (row.querySelector('.unitime-TableHeader')) continue;
      const cells = row.querySelectorAll('td[role="gridcell"]');
      if (cells.length < MIN_CLASS_ROW_CELLS || cells.length <= instructorIdx) continue;

      const text = (cells[instructorIdx]?.textContent || '').trim();
      if (!text) continue;

      const key = keyFor(text);
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
