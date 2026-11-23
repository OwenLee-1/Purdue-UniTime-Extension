import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBlockVisibility } from '../src/content/detector.js';
import { professorKey } from '../src/core/blocks.js';

function matches(node, sel) {
  if (sel === 'table') return node.tagName === 'TABLE';
  if (sel === '.unitime-TableHeader') return node.className.split(/\s+/).includes('unitime-TableHeader');
  if (sel === 'tr[role="row"]') return node.tagName === 'TR' && node.role === 'row';
  if (sel === 'td[role="gridcell"]') return node.tagName === 'TD' && node.role === 'gridcell';
  return false;
}

function el(tag, { className = '', role = '', text = '', children = [] } = {}) {
  const node = {
    tagName: tag.toUpperCase(),
    className,
    role,
    textContent: text,
    style: { display: '' },
    dataset: {},
    children,
    querySelector(sel) {
      return this.querySelectorAll(sel)[0] || null;
    },
    querySelectorAll(sel) {
      const out = [];
      const walk = (n) => {
        for (const child of n.children) {
          if (matches(child, sel)) out.push(child);
          walk(child);
        }
      };
      walk(this);
      return out;
    },
  };
  return node;
}

function cell(text) {
  return el('td', { role: 'gridcell', text });
}

function header(text) {
  return el('th', { className: 'unitime-TableHeader', text });
}

/**
 * Purdue schedule list: Subject, Course, Type, CRN-SectionId, Days, Start, Room, Instructor.
 * Eight gridcells so the row counts as a full class row.
 */
function scheduleRow(instructor) {
  const labels = ['MA', '16200', 'Lec', '23584-100', 'MWF', '10:30a', 'BHEE 129', instructor];
  return el('tr', { role: 'row', children: labels.map(cell) });
}

function scheduleTable(rows) {
  const headers = ['Subject', 'Course', 'Type', 'CRN-SectionId', 'Days', 'Start', 'Room', 'Instructor'];
  return el('table', {
    children: [el('tr', { role: 'row', children: headers.map(header) }), ...rows],
  });
}

test('a reused schedule row is shown again when it no longer contains the hidden professor', () => {
  const robbins = scheduleRow('J R Robbins');
  const klehfoth = scheduleRow('M G Klehfoth');
  const table = scheduleTable([robbins, klehfoth]);
  globalThis.document = { querySelectorAll: () => [table] };

  const blocks = { [professorKey('J R Robbins')]: { rawName: 'J R Robbins' } };
  applyBlockVisibility(blocks, professorKey);

  assert.equal(robbins.style.display, 'none');
  assert.equal(robbins.dataset.rmpBlocked, '1');
  assert.equal(klehfoth.style.display, '');

  // WebTable.setData keeps the <tr> and replaces the instructor cell text.
  robbins.children[7].textContent = 'S Ferdoush';
  applyBlockVisibility(blocks, professorKey);

  assert.equal(robbins.style.display, '');
  assert.equal(robbins.dataset.rmpBlocked, undefined);
  assert.equal(klehfoth.style.display, '');
});

test('a reused row that still names the hidden professor stays hidden', () => {
  const robbins = scheduleRow('J R Robbins');
  const table = scheduleTable([robbins]);
  globalThis.document = { querySelectorAll: () => [table] };

  const blocks = { [professorKey('J R Robbins')]: { rawName: 'J R Robbins' } };
  applyBlockVisibility(blocks, professorKey);
  robbins.children[7].textContent = 'J. R. Robbins';
  applyBlockVisibility(blocks, professorKey);

  assert.equal(robbins.style.display, 'none');
  assert.equal(robbins.dataset.rmpBlocked, '1');
});
