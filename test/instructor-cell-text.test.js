import test from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeInstructorName, readInstructorCellText } from '../src/content/detector.js';
import { professorKey } from '../src/core/blocks.js';

function classes(...names) {
  const set = new Set(names);
  return { contains: (name) => set.has(name) };
}

function textNode(value) {
  return { nodeType: 3, nodeValue: value };
}

function element(tag, { classNames = [], href = '', children = [] } = {}) {
  return {
    nodeType: 1,
    tagName: tag,
    classList: classes(...classNames),
    className: classNames.join(' '),
    getAttribute: (name) => (name === 'href' ? href : null),
    childNodes: children,
  };
}

/** Plain-text instructor cell plus the comparison chip appended by markBest. */
function plainTextCellWithBestChip(name) {
  return element('td', {
    children: [
      textNode(name),
      element('span', {
        classNames: ['rmp-best-chip'],
        children: [textNode('✓ Best')],
      }),
      element('span', {
        classNames: ['rmp-badge-host'],
        children: [textNode('★ 4.8')],
      }),
    ],
  });
}

test('Best chip does not become part of a plain-text instructor name', () => {
  const polluted = 'S Weng✓ Best';
  assert.equal(looksLikeInstructorName(polluted), false);
  assert.equal(professorKey(polluted), 'purdue:best:s');

  const cell = plainTextCellWithBestChip('S Weng');
  const text = readInstructorCellText(cell);
  assert.equal(text, 'S Weng');
  assert.equal(looksLikeInstructorName(text), true);
  assert.equal(professorKey(text), 'purdue:weng:s');
});

test('instructor link text is used and a sibling Best chip is ignored', () => {
  const cell = element('td', {
    children: [
      element('a', {
        href: 'https://timetable.mypurdue.purdue.edu/instructor',
        children: [textNode('Doe, Jane')],
      }),
      element('span', {
        classNames: ['rmp-best-chip'],
        children: [textNode('✓ Best')],
      }),
    ],
  });
  const text = readInstructorCellText(cell);
  assert.equal(text, 'Doe, Jane');
  assert.equal(looksLikeInstructorName(text), true);
  assert.equal(professorKey(text), 'purdue:doe:jane');
});

test('Last, First cells still match after the Best chip is appended', () => {
  const cell = plainTextCellWithBestChip('Weng, Shuangqing');
  const text = readInstructorCellText(cell);
  assert.equal(text, 'Weng, Shuangqing');
  assert.equal(looksLikeInstructorName(text), true);
  assert.equal(professorKey(text), 'purdue:weng:shuangqing');
});
