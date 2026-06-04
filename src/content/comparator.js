// Multi-section comparison (milestone M5).
//
// When the same course (e.g. "MA 26100") is taught by several professors, this
// module highlights the best option so a student can pick at a glance. "Best" uses
// the composite score (RMP + would-take-again + course GPA) when available.
// We group detected rows by course, and each time a rating arrives we re-evaluate
// the group and move the "Best" marker / row highlight to the current winner(s).
//
// We only mark a winner when there are at least two rated sections AND they don't
// all share the same rating (otherwise "best" would be meaningless).

import { sectionCompareScore } from '../core/compositeScore.js';

const groups = new Map();

const ROW_HIGHLIGHT = 'rmp-best-row';
const CHIP_CLASS = 'rmp-best-chip';

/**
 * @typedef {Object} CompareEntry
 * @property {Element} rowElement
 * @property {Element} instructorCell
 * @property {object} [result]
 * @property {object} [group]
 */

/**
 * Register a detected section under its course.
 * @param {string} courseKey  e.g. "MA 26100"
 * @param {CompareEntry} entry
 */
export function addToComparison(courseKey, entry) {
  if (!courseKey) return;
  let group = groups.get(courseKey);
  if (!group) {
    group = { entries: [] };
    groups.set(courseKey, group);
  }
  group.entries.push(entry);
  entry.group = group;
}

/**
 * Record a professor's rating for an entry and recompute its course group.
 * @param {CompareEntry} entry
 * @param {object} result
 */
export function setEntryResult(entry, result) {
  entry.result = result;
  if (entry.group) reevaluate(entry.group);
}

/**
 * Remove an entry (e.g. when the user hides this professor).
 * @param {CompareEntry} entry
 */
export function removeFromComparison(entry) {
  const group = entry?.group;
  if (!group) return;
  group.entries = group.entries.filter((e) => e !== entry);
  entry.group = undefined;
  reevaluate(group);
}

function reevaluate(group) {
  // Drop entries whose rows were removed by a GWT re-render.
  group.entries = group.entries.filter((e) => e.rowElement && e.rowElement.isConnected);

  const rated = group.entries.filter((e) => {
    if (e.blocked) return false;
    if (e.result?.status !== 'ok') return false;
    return sectionCompareScore(e.result) != null;
  });

  // Clear any existing markers first.
  for (const e of group.entries) clearBest(e);

  if (rated.length < 2) return;

  const scores = rated.map((e) => sectionCompareScore(e.result));
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  if (max <= min) return; // all equal → no meaningful "best"

  for (const e of rated) {
    if (sectionCompareScore(e.result) === max) markBest(e);
  }
}

function markBest(entry) {
  const row = entry.rowElement;
  if (row && !row.classList.contains(ROW_HIGHLIGHT)) {
    row.classList.add(ROW_HIGHLIGHT);
    row.style.background = 'rgba(22, 163, 74, 0.10)';
    row.style.boxShadow = 'inset 3px 0 0 0 #16a34a';
  }

  const cell = entry.instructorCell;
  if (cell && !cell.querySelector(`.${CHIP_CLASS}`)) {
    const chip = document.createElement('span');
    chip.className = CHIP_CLASS;
    chip.textContent = '✓ Best';
    const score = sectionCompareScore(entry.result);
    if (score != null) {
      chip.title = `Highest composite/compare score in this course (${score.toFixed(2)})`;
    }
    Object.assign(chip.style, {
      marginLeft: '6px',
      padding: '1px 6px',
      borderRadius: '9999px',
      background: '#16a34a',
      color: '#fff',
      fontSize: '11px',
      fontFamily: 'system-ui, sans-serif',
      fontWeight: '700',
      verticalAlign: 'middle',
    });
    cell.appendChild(chip);
  }
}

function clearBest(entry) {
  const row = entry.rowElement;
  if (row && row.classList.contains(ROW_HIGHLIGHT)) {
    row.classList.remove(ROW_HIGHLIGHT);
    row.style.background = '';
    row.style.boxShadow = '';
  }
  const chip = entry.instructorCell?.querySelector(`.${CHIP_CLASS}`);
  if (chip) chip.remove();
}
