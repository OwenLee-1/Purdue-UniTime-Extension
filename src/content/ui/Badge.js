// The little inline pill next to an instructor name.
//
// It renders differently depending on the lookup status:
//   loading      -> a muted "…" while we wait on the background worker
//   ok           -> ★rating · GPA, color-coded green/yellow/red by rating
//   (GPA only)   -> a neutral "X.XX GPA" pill when grade data exists but no RMP match
//   no_match /   -> a faint neutral "?" (we won't guess on the wrong professor)
//   ambiguous
//   fetch_failed -> a faint "!" so it's distinguishable in debug, but quiet
//
// staff_tba is handled by the injector (it just removes the badge entirely).

/**
 * Pick a color based on the overall rating.
 * @param {number|undefined} overall
 */
function colorFor(overall) {
  if (overall === undefined) return '#9ca3af';
  if (overall >= 4) return '#16a34a';
  if (overall >= 3) return '#ca8a04';
  return '#dc2626';
}

/**
 * Color a standalone GPA pill (higher GPA = greener).
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
  padding: '1px 7px',
  borderRadius: '9999px',
  fontSize: '12px',
  fontFamily: 'system-ui, sans-serif',
  fontWeight: '600',
  lineHeight: '1.5',
  whiteSpace: 'nowrap',
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
    pill.title = 'Looking up RateMyProfessors…';
    return pill;
  }

  const hasRating = typeof result?.overall === 'number';
  const hasGpa = typeof result?.gpa === 'number';

  if (hasRating) {
    // Primary case: RMP rating + (course GPA in place of difficulty).
    const gpaPart = hasGpa ? ` · ${result.gpa.toFixed(2)} GPA` : '';
    Object.assign(pill.style, { background: colorFor(result.overall), color: '#fff', cursor: 'pointer' });
    pill.textContent = `★ ${result.overall.toFixed(1)}${gpaPart}`;

    const wta = result.detail?.wouldTakeAgainPct;
    const comp = result.composite?.score;
    pill.title =
      `RateMyProfessors: ${result.overall.toFixed(1)}/5` +
      (hasGpa ? `, avg GPA ${result.gpa.toFixed(2)}` : '') +
      (comp != null ? `, composite ${comp.toFixed(1)}/5` : '') +
      (result.difficulty !== undefined ? `, difficulty ${result.difficulty.toFixed(1)}/5` : '') +
      (wta !== undefined ? `, ${wta}% would take again` : '') +
      (result.sampleSize ? ` (${result.sampleSize} ratings)` : '');
    applyPersonalIndicators(pill, result.userMark);
    return pill;
  }

  if (hasGpa) {
    // We have grade data but no confident RMP rating — still useful on its own.
    Object.assign(pill.style, { background: gpaColor(result.gpa), color: '#fff', cursor: 'pointer' });
    pill.textContent = `${result.gpa.toFixed(2)} GPA`;
    pill.title = `Average GPA ${result.gpa.toFixed(2)} for this course` +
      (result.gpaSampleSize ? ` (${result.gpaSampleSize} sections)` : '') +
      ' — no confident RateMyProfessors match.';
    applyPersonalIndicators(pill, result.userMark);
    return pill;
  }

  // no_match / ambiguous / fetch_failed -> quiet neutral marker.
  Object.assign(pill.style, {
    background: 'transparent',
    color: '#9ca3af',
    border: '1px solid #d1d5db',
    fontWeight: '500',
  });
  pill.textContent = status === 'fetch_failed' ? '!' : '?';
  pill.title =
    status === 'ambiguous'
      ? 'Multiple professors match this name — not shown to avoid a wrong match.'
      : status === 'fetch_failed'
        ? "Couldn't reach RateMyProfessors."
        : 'No confident RateMyProfessors match.';
  applyPersonalIndicators(pill, result.userMark);
  return pill;
}
