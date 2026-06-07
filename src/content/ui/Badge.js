// The little inline pill next to an instructor name.
//
// Pill: RMP ★ + course GPA at a glance. Hover for preview, click for full panel.

/**
 * @param {number|undefined} score  0–5 scale (RMP)
 */
function colorFor(score) {
  if (score === undefined) return '#9ca3af';
  if (score >= 4) return '#16a34a';
  if (score >= 3) return '#ca8a04';
  return '#dc2626';
}

/**
 * @param {number} gpa
 */
function gpaColor(gpa) {
  if (gpa >= 3.3) return '#16a34a';
  if (gpa >= 2.7) return '#ca8a04';
  return '#dc2626';
}

/**
 * @param {HTMLElement} pill
 * @param {import('../../core/userMarks.js').UserMark | null | undefined} mark
 */
function applyPersonalIndicators(pill, mark) {
  if (!mark) return;
  const tags = [];
  if (mark.sentiment === 'like') tags.push('👍');
  if (mark.sentiment === 'dislike') tags.push('👎');
  if (mark.taken) tags.push('✓ had');

  if (!tags.length) return;
  pill.textContent = `${pill.textContent} · ${tags.join(' ')}`;

  const lines = [];
  if (mark.sentiment === 'like') lines.push('You liked this professor');
  if (mark.sentiment === 'dislike') lines.push('You disliked this professor');
  if (mark.taken) lines.push('You had this professor before');
  if (mark.note) lines.push(`Your note: ${mark.note}`);
  const extra = lines.join(' · ');
  pill.title = pill.title ? `${pill.title}\n${extra}` : extra;
}

const BASE_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '1px 8px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontFamily: 'system-ui, sans-serif',
  fontWeight: '600',
  lineHeight: '1.5',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
};

/**
 * @param {import('../../core/providers/Provider.js').ProviderResult & {status: string}} [result]
 * @returns {HTMLElement}
 */
export function createBadge(result) {
  const pill = document.createElement('span');
  Object.assign(pill.style, BASE_STYLE);

  const status = result?.status;

  if (status === 'loading') {
    Object.assign(pill.style, { background: '#e5e7eb', color: '#6b7280' });
    pill.textContent = '…';
    pill.title = 'Looking up ratings…';
    return pill;
  }

  const hasRmp = typeof result?.overall === 'number';
  const hasGpa = typeof result?.gpa === 'number';

  if (hasRmp || hasGpa) {
    const parts = [];
    if (hasRmp) parts.push(`★ ${result.overall.toFixed(1)}`);
    if (hasGpa) parts.push(`${result.gpa.toFixed(2)} GPA`);

    const bg = hasRmp ? colorFor(result.overall) : gpaColor(result.gpa);
    Object.assign(pill.style, { background: bg, color: '#fff' });
    pill.textContent = parts.join(' · ');
    pill.title = 'Hover for preview · click for full details';
    applyPersonalIndicators(pill, result.userMark);
    return pill;
  }

  Object.assign(pill.style, {
    background: 'transparent',
    color: '#9ca3af',
    border: '1px solid #d1d5db',
    fontWeight: '500',
  });
  pill.textContent = status === 'fetch_failed' ? '!' : '?';
  pill.title =
    status === 'ambiguous'
      ? 'Multiple professors match this name — click for details.'
      : status === 'fetch_failed'
        ? "Couldn't reach RateMyProfessors. Click for details."
        : 'No confident RateMyProfessors match. Click for details.';
  applyPersonalIndicators(pill, result.userMark);
  return pill;
}
