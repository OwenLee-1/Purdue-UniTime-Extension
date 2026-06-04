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

function sectionLabel(text) {
  const el = document.createElement('div');
  el.textContent = text;
  Object.assign(el.style, {
    color: '#9ca3af',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    margin: '10px 0 4px',
  });
  return el;
}

const GRADE_COLORS = { A: '#16a34a', B: '#65a30d', C: '#ca8a04', D: '#ea580c', F: '#dc2626' };

/**
 * A stacked horizontal A/B/C/D/F bar with a compact legend underneath.
 * @param {{A:number,B:number,C:number,D:number,F:number}} dist
 */
function gradeDistribution(dist) {
  const wrap = document.createElement('div');

  const bar = document.createElement('div');
  Object.assign(bar.style, {
    display: 'flex',
    height: '10px',
    borderRadius: '5px',
    overflow: 'hidden',
    background: '#374151',
  });
  for (const g of ['A', 'B', 'C', 'D', 'F']) {
    const pct = dist[g] || 0;
    if (pct <= 0) continue;
    const seg = document.createElement('div');
    Object.assign(seg.style, { width: `${pct}%`, background: GRADE_COLORS[g] });
    seg.title = `${g}: ${pct}%`;
    bar.appendChild(seg);
  }
  wrap.appendChild(bar);

  const legend = document.createElement('div');
  Object.assign(legend.style, {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '4px',
    fontSize: '10px',
    color: '#d1d5db',
  });
  for (const g of ['A', 'B', 'C', 'D', 'F']) {
    const item = document.createElement('span');
    const dot = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${GRADE_COLORS[g]};margin-right:3px"></span>`;
    item.innerHTML = `${dot}${g} ${dist[g] || 0}%`;
    legend.appendChild(item);
  }
  wrap.appendChild(legend);

  return wrap;
}

/**
 * A single RMP review snippet.
 * @param {import('../../core/providers/Provider.js').ReviewSnippet} review
 */
function reviewSnippet(review) {
  const el = document.createElement('div');
  Object.assign(el.style, {
    background: '#1f2937',
    borderRadius: '6px',
    padding: '6px 8px',
    margin: '4px 0',
  });

  const meta = document.createElement('div');
  Object.assign(meta.style, {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: '#9ca3af',
    marginBottom: '3px',
  });
  const cls = document.createElement('span');
  cls.textContent = review.class || '';
  const q = document.createElement('span');
  if (typeof review.quality === 'number') {
    q.textContent = `★ ${review.quality}`;
    q.style.color = colorFor(review.quality);
    q.style.fontWeight = '700';
  }
  meta.append(cls, q);
  el.appendChild(meta);

  const body = document.createElement('div');
  body.textContent = review.comment;
  Object.assign(body.style, {
    fontSize: '11px',
    lineHeight: '1.4',
    color: '#e5e7eb',
    display: '-webkit-box',
    webkitLineClamp: '4',
    WebkitLineClamp: '4',
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  });
  el.appendChild(body);

  return el;
}

/**
 * @typedef {Object} PopoverHooks
 * @property {string} [rawName]
 * @property {boolean} [isBlocked]
 * @property {(blocked: boolean) => void | Promise<void>} [onBlockToggle]
 * @property {import('../../core/userMarks.js').UserMark | null} [userMark]
 * @property {(mark: import('../../core/userMarks.js').UserMark | null) => void | Promise<void>} [onMarkUpdate]
 */

/**
 * Like / dislike / taken / note controls (B2 personal layer).
 * @param {PopoverHooks} hooks
 */
function personalMarksSection(hooks) {
  const wrap = document.createElement('div');
  wrap.style.marginTop = '10px';

  wrap.appendChild(sectionLabel('Your take'));

  const btnRow = document.createElement('div');
  Object.assign(btnRow.style, { display: 'flex', gap: '6px', marginBottom: '6px' });

  const likeBtn = document.createElement('button');
  const dislikeBtn = document.createElement('button');
  for (const [btn, label, value] of [
    [likeBtn, '👍 Like', 'like'],
    [dislikeBtn, '👎 Dislike', 'dislike'],
  ]) {
    btn.type = 'button';
    btn.textContent = label;
    Object.assign(btn.style, {
      flex: '1',
      padding: '5px 6px',
      borderRadius: '6px',
      border: '1px solid #4b5563',
      background: hooks.userMark?.sentiment === value ? '#374151' : '#1f2937',
      color: '#f9fafb',
      fontSize: '11px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontWeight: hooks.userMark?.sentiment === value ? '700' : '500',
    });
  }

  async function setSentiment(next) {
    const current = hooks.userMark?.sentiment;
    const sentiment = current === next ? null : next;
    if (hooks.onMarkUpdate) await hooks.onMarkUpdate({ sentiment });
  }

  likeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setSentiment('like');
  });
  dislikeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setSentiment('dislike');
  });
  btnRow.append(likeBtn, dislikeBtn);
  wrap.appendChild(btnRow);

  const takenLabel = document.createElement('label');
  Object.assign(takenLabel.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#d1d5db',
    cursor: 'pointer',
    marginBottom: '6px',
  });
  const takenBox = document.createElement('input');
  takenBox.type = 'checkbox';
  takenBox.checked = !!hooks.userMark?.taken;
  takenLabel.append(takenBox, document.createTextNode("I've had this professor"));
  takenBox.addEventListener('change', (e) => {
    e.stopPropagation();
    if (hooks.onMarkUpdate) hooks.onMarkUpdate({ taken: takenBox.checked });
  });
  wrap.appendChild(takenLabel);

  const noteInput = document.createElement('textarea');
  noteInput.placeholder = 'Optional note (e.g. took for MA 261)';
  noteInput.value = hooks.userMark?.note || '';
  Object.assign(noteInput.style, {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '44px',
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #4b5563',
    background: '#1f2937',
    color: '#f9fafb',
    fontSize: '11px',
    fontFamily: 'inherit',
    resize: 'vertical',
  });
  noteInput.addEventListener('click', (e) => e.stopPropagation());
  noteInput.addEventListener('change', () => {
    if (hooks.onMarkUpdate) hooks.onMarkUpdate({ note: noteInput.value });
  });
  wrap.appendChild(noteInput);

  return wrap;
}

/**
 * @param {import('../../core/providers/Provider.js').ProviderResult} result
 * @param {PopoverHooks} [hooks]
 * @returns {HTMLElement}
 */
export function createPopover(result, hooks = {}) {
  const detail = result.detail || {};

  const card = document.createElement('div');
  Object.assign(card.style, {
    position: 'fixed',
    zIndex: '2147483647',
    minWidth: '230px',
    maxWidth: '290px',
    maxHeight: '70vh',
    overflowY: 'auto',
    padding: '10px 12px',
    borderRadius: '10px',
    background: '#111827',
    color: '#f9fafb',
    fontSize: '12px',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    pointerEvents: 'auto',
  });

  // Header: name + (course · department) context.
  const header = document.createElement('div');
  header.style.marginBottom = '6px';
  const name = document.createElement('div');
  name.textContent = detail.name || result.displayName || 'Professor';
  Object.assign(name.style, { fontWeight: '700', fontSize: '13px' });
  header.appendChild(name);

  const subParts = [];
  if (result.course) subParts.push(result.course);
  if (detail.department) subParts.push(detail.department);
  if (subParts.length) {
    const sub = document.createElement('div');
    sub.textContent = subParts.join(' · ');
    Object.assign(sub.style, { color: '#9ca3af', fontSize: '11px' });
    header.appendChild(sub);
  }
  card.appendChild(header);

  const hasRating = typeof result.overall === 'number';
  const composite = result.composite;

  // Headline: composite estimate when we have enough signals, else RMP or GPA alone.
  const headline = document.createElement('div');
  const headlineScore = composite?.score ?? (hasRating ? result.overall : null);
  Object.assign(headline.style, {
    fontSize: '18px',
    fontWeight: '800',
    color: headlineScore != null ? colorFor(headlineScore) : '#f9fafb',
    margin: '2px 0 6px',
  });
  if (composite?.score != null) {
    headline.textContent = `◎ ${composite.score.toFixed(1)} / 5 composite`;
    headline.title =
      'Blends RMP rating, would-take-again, course GPA, and recent review stars (see breakdown below)';
  } else if (hasRating) {
    headline.textContent = `★ ${result.overall.toFixed(1)} / 5`;
  } else if (typeof result.gpa === 'number') {
    headline.textContent = `${result.gpa.toFixed(2)} avg GPA`;
  } else {
    headline.textContent = '—';
  }
  card.appendChild(headline);

  if (hasRating) {
    const rmpLine = document.createElement('div');
    const n = result.sampleSize ? ` · ${result.sampleSize} ratings` : '';
    rmpLine.textContent = `★ ${result.overall.toFixed(1)} / 5 instructor RMP${n}`;
    Object.assign(rmpLine.style, {
      fontSize: '13px',
      fontWeight: '700',
      color: colorFor(result.overall),
      margin: '0 0 8px',
    });
    card.appendChild(rmpLine);
  } else if (result.rmpStatus && result.rmpStatus !== 'staff_tba') {
    const rmpNote = document.createElement('div');
    const msg =
      result.rmpStatus === 'ambiguous'
        ? 'Multiple RateMyProfessors matches — open the profile link below if you know the right one.'
        : result.rmpStatus === 'fetch_failed'
          ? `Could not reach RateMyProfessors.${result.rmpErrorDetail ? ` (${result.rmpErrorDetail})` : ''} Reload the extension from dist/, clear cache, and refresh. On campus Wi‑Fi, try another network if this persists.`
          : 'No confident RateMyProfessors match for this name.';
    rmpNote.textContent = msg;
    Object.assign(rmpNote.style, {
      fontSize: '11px',
      color: '#fbbf24',
      margin: '0 0 8px',
      lineHeight: '1.35',
    });
    card.appendChild(rmpNote);
  }

  if (composite?.parts?.length) {
    card.appendChild(sectionLabel('Composite breakdown'));
    const totalWeight = composite.parts.reduce((s, p) => s + p.weight, 0);
    for (const p of composite.parts) {
      // RMP is shown above as its own instructor line — skip duplicate row here.
      if (p.label === 'RMP rating' && hasRating) continue;

      const weightPct = totalWeight > 0 ? Math.round((p.weight / totalWeight) * 100) : 0;
      const signalPct = Math.round(p.normalized * 100);
      card.appendChild(
        row(p.label, `${p.raw} · ${weightPct}% weight · ${signalPct}% signal`)
      );
    }
  }

  const sentiment = result.reviewSentiment;
  if (sentiment) {
    const toneColor =
      sentiment.tone === 'mostly positive'
        ? '#16a34a'
        : sentiment.tone === 'mostly negative'
          ? '#dc2626'
          : '#ca8a04';
    card.appendChild(sectionLabel('Recent review sentiment'));
    const line = document.createElement('div');
    line.textContent = `${sentiment.tone} · avg ${sentiment.avg.toFixed(1)}/5 (${sentiment.positivePct}% ≥4★, n=${sentiment.count})`;
    Object.assign(line.style, { color: toneColor, fontWeight: '600', fontSize: '11px', marginBottom: '4px' });
    card.appendChild(line);
  }

  if (typeof result.gpa === 'number') {
    const n = result.gpaSampleSize ? ` (${result.gpaSampleSize} sections)` : '';
    card.appendChild(row('Avg GPA (this course)', `${result.gpa.toFixed(2)}${n}`));
  }
  if (hasRating && result.difficulty !== undefined) {
    card.appendChild(row('RMP difficulty', `${result.difficulty.toFixed(1)} / 5`));
  } else if (result.difficulty !== undefined) {
    card.appendChild(row('Difficulty', `${result.difficulty.toFixed(1)} / 5`));
  }
  if (detail.wouldTakeAgainPct !== undefined) card.appendChild(row('Would take again', `${detail.wouldTakeAgainPct}%`));
  if (result.sampleSize !== undefined) card.appendChild(row('Ratings', String(result.sampleSize)));

  // Grade distribution histogram (from the bundled BoilerGrades data).
  if (result.gpaDistribution) {
    card.appendChild(sectionLabel('Grade distribution'));
    card.appendChild(gradeDistribution(result.gpaDistribution));
  }

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

  // Recent student comments (from RateMyProfessors).
  if (detail.reviews?.length) {
    card.appendChild(sectionLabel('Recent comments'));
    detail.reviews.forEach((rev) => card.appendChild(reviewSnippet(rev)));
  } else if (result.sampleSize > 0) {
    const hint = document.createElement('div');
    hint.textContent = 'No review text returned from RateMyProfessors for this match.';
    Object.assign(hint.style, { color: '#6b7280', fontSize: '10px', marginTop: '6px' });
    card.appendChild(hint);
  }

  if (hooks.rawName && hooks.onMarkUpdate) {
    card.appendChild(personalMarksSection(hooks));
  }

  if (hooks.rawName && hooks.onBlockToggle) {
    const blockBtn = document.createElement('button');
    blockBtn.type = 'button';
    blockBtn.textContent = hooks.isBlocked ? 'Unhide this professor' : 'Hide this professor';
    Object.assign(blockBtn.style, {
      width: '100%',
      marginTop: '10px',
      padding: '6px 8px',
      borderRadius: '6px',
      border: 'none',
      background: hooks.isBlocked ? '#374151' : '#7f1d1d',
      color: '#fff',
      fontSize: '11px',
      fontWeight: '600',
      cursor: 'pointer',
      fontFamily: 'inherit',
    });
    blockBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hooks.onBlockToggle(!hooks.isBlocked);
    });
    card.appendChild(blockBtn);
    const hint = document.createElement('div');
    hint.textContent = 'Hidden sections disappear from your class list until you unhide.';
    Object.assign(hint.style, { color: '#6b7280', fontSize: '10px', marginTop: '4px' });
    card.appendChild(hint);
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
