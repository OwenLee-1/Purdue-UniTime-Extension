// The hover card that reveals the richer details when you mouse over a badge.
//
// Shows would-take-again %, number of ratings, department, top tags (when RMP
// has them), and a link to the full RateMyProfessors profile. Rendered inside
// the badge's shadow root so its styling stays isolated from UniTime.

function colorFor(overall) {
  if (overall === undefined) return '#9ca3af';
  if (overall >= 4) return '#16a34a';
  if (overall >= 3) return '#ca8a04';
  return '#dc2626';
}

function row(label, value) {
  const r = document.createElement('div');
  Object.assign(r.style, { display: 'flex', justifyContent: 'space-between', gap: '14px', margin: '2px 0' });
  const l = document.createElement('span');
  l.textContent = label;
  l.style.color = '#9ca3af';
  const v = document.createElement('span');
  v.textContent = value;
  v.style.fontWeight = '600';
  r.append(l, v);
  return r;
}

/**
 * Build the hover card element for an "ok" result.
 * @param {import('../../core/providers/Provider.js').ProviderResult} result
 * @returns {HTMLElement}
 */
export function createPopover(result) {
  const detail = result.detail || {};

  const card = document.createElement('div');
  Object.assign(card.style, {
    position: 'fixed',
    zIndex: '2147483647',
    minWidth: '210px',
    maxWidth: '260px',
    padding: '10px 12px',
    borderRadius: '10px',
    background: '#111827',
    color: '#f9fafb',
    fontSize: '12px',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    pointerEvents: 'auto',
  });

  // Header: name + department.
  const header = document.createElement('div');
  header.style.marginBottom = '6px';
  const name = document.createElement('div');
  name.textContent = detail.name || 'Professor';
  Object.assign(name.style, { fontWeight: '700', fontSize: '13px' });
  header.appendChild(name);
  if (detail.department) {
    const dept = document.createElement('div');
    dept.textContent = detail.department;
    Object.assign(dept.style, { color: '#9ca3af', fontSize: '11px' });
    header.appendChild(dept);
  }
  card.appendChild(header);

  // Big rating line.
  const ratingLine = document.createElement('div');
  Object.assign(ratingLine.style, {
    fontSize: '18px',
    fontWeight: '800',
    color: colorFor(result.overall),
    margin: '2px 0 6px',
  });
  ratingLine.textContent = `★ ${result.overall?.toFixed(1) ?? '—'} / 5`;
  card.appendChild(ratingLine);

  if (result.difficulty !== undefined) card.appendChild(row('Difficulty', `${result.difficulty.toFixed(1)} / 5`));
  if (detail.wouldTakeAgainPct !== undefined) card.appendChild(row('Would take again', `${detail.wouldTakeAgainPct}%`));
  if (result.sampleSize !== undefined) card.appendChild(row('Ratings', String(result.sampleSize)));

  // Tags (if RMP provided any).
  if (detail.tags?.length) {
    const tagWrap = document.createElement('div');
    Object.assign(tagWrap.style, { display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '8px 0 2px' });
    detail.tags.forEach((t) => {
      const chip = document.createElement('span');
      chip.textContent = t;
      Object.assign(chip.style, {
        background: '#374151',
        borderRadius: '9999px',
        padding: '1px 8px',
        fontSize: '10px',
      });
      tagWrap.appendChild(chip);
    });
    card.appendChild(tagWrap);
  }

  // Profile link.
  if (detail.profileUrl) {
    const link = document.createElement('a');
    link.href = detail.profileUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'View on RateMyProfessors →';
    Object.assign(link.style, {
      display: 'inline-block',
      marginTop: '8px',
      color: '#60a5fa',
      textDecoration: 'none',
      fontSize: '11px',
    });
    card.appendChild(link);
  }

  return card;
}
