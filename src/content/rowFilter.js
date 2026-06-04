// Hide or restore UniTime class rows for blocked professors.

/**
 * @param {Element} row
 */
export function hideProfessorRow(row) {
  if (!row) return;
  row.style.display = 'none';
  row.dataset.rmpBlocked = '1';
}

/**
 * @param {Element} row
 */
export function showProfessorRow(row) {
  if (!row) return;
  row.style.display = '';
  delete row.dataset.rmpBlocked;
}
