// The little inline pill next to an instructor name.
//
// It renders differently depending on the lookup status:
//   loading      -> a muted "…" while we wait on the background worker
//   ok           -> ★rating · difficulty, color-coded green/yellow/red
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

  if (status === 'ok' && result.overall !== undefined) {
    const diff = result.difficulty !== undefined ? ` · ${result.difficulty.toFixed(1)}` : '';
    Object.assign(pill.style, { background: colorFor(result.overall), color: '#fff', cursor: 'pointer' });
    pill.textContent = `★ ${result.overall.toFixed(1)}${diff}`;

    const wta = result.detail?.wouldTakeAgainPct;
    pill.title =
      `RateMyProfessors: ${result.overall.toFixed(1)}/5` +
      (result.difficulty !== undefined ? `, difficulty ${result.difficulty.toFixed(1)}/5` : '') +
      (wta !== undefined ? `, ${wta}% would take again` : '') +
      (result.sampleSize ? ` (${result.sampleSize} ratings)` : '');
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
  return pill;
}
