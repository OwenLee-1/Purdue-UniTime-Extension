// Right-hand professor detail panel (click badge). Hover uses Popover preview.
// Fixed to the viewport edge so content is never clipped by the tab chrome.

import { fallbackShortenReview, shortenReviewBatch } from '../../core/reviewSummarizer.js';

const COMMENT_LINE_CLAMP = 2;

function colorFor(overall) {
  if (overall === undefined) return '#9ca3af';
  if (overall >= 4) return '#16a34a';
  if (overall >= 3) return '#ca8a04';
  return '#dc2626';
}

function gpaColor(gpa) {
  if (gpa >= 3.3) return '#16a34a';
  if (gpa >= 2.7) return '#ca8a04';
  return '#dc2626';
}

function truncateComment(text) {
  return fallbackShortenReview(text);
}

/**
 * @param {import('../../core/providers/Provider.js').ReviewSnippet[]} reviews
 * @param {HTMLParagraphElement[]} textEls
 */
function hydrateReviewSummaries(reviews, textEls) {
  shortenReviewBatch(reviews)
    .then((summaries) => {
      summaries.forEach((summary, i) => {
        if (textEls[i] && summary) textEls[i].textContent = summary;
      });
    })
    .catch(() => {});
}

/**
 * @param {string} label
 * @param {string} value
 * @param {{ valueColor?: string, emphasize?: boolean }} [opts]
 */
function tableRow(label, value, opts = {}) {
  const tr = document.createElement('tr');
  const th = document.createElement('th');
  th.textContent = label;
  Object.assign(th.style, {
    textAlign: 'left',
    fontWeight: '500',
    color: '#9ca3af',
    padding: '6px 10px 6px 0',
    verticalAlign: 'top',
    width: '42%',
    whiteSpace: 'nowrap',
  });
  const td = document.createElement('td');
  td.textContent = value;
  Object.assign(td.style, {
    textAlign: 'right',
    fontWeight: opts.emphasize ? '700' : '600',
    color: opts.valueColor || '#f3f4f6',
    padding: '6px 0',
    verticalAlign: 'top',
    wordBreak: 'break-word',
  });
  tr.append(th, td);
  return tr;
}

function sectionBlock(title) {
  const wrap = document.createElement('section');
  Object.assign(wrap.style, {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #374151',
  });
  const heading = document.createElement('h3');
  heading.textContent = title;
  Object.assign(heading.style, {
    margin: '0 0 8px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#9ca3af',
  });
  wrap.appendChild(heading);
  return wrap;
}

const GRADE_COLORS = { A: '#16a34a', B: '#65a30d', C: '#ca8a04', D: '#ea580c', F: '#dc2626' };

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
    bar.appendChild(seg);
  }
  wrap.appendChild(bar);
  return wrap;
}

/**
 * @typedef {Object} PanelHooks
 * @property {string} [rawName]
 * @property {boolean} [isBlocked]
 * @property {(blocked: boolean) => void | Promise<void>} [onBlockToggle]
 * @property {import('../../core/userMarks.js').UserMark | null} [userMark]
 * @property {(mark: import('../../core/userMarks.js').UserMark | null) => void | Promise<void>} [onMarkUpdate]
 * @property {() => void} [onClose]
 */

/**
 * @param {import('../../core/providers/Provider.js').ProviderResult} result
 * @param {PanelHooks} [hooks]
 * @returns {{ root: HTMLElement, backdrop: HTMLElement }}
 */
export function createProfessorPanel(result, hooks = {}) {
  const detail = result.detail || {};

  const backdrop = document.createElement('div');
  Object.assign(backdrop.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.25)',
    zIndex: '2147483646',
    pointerEvents: 'auto',
  });
  backdrop.addEventListener('click', () => hooks.onClose?.());

  const panel = document.createElement('aside');
  panel.className = 'rmp-professor-panel';
  Object.assign(panel.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    width: 'min(420px, 92vw)',
    height: '100vh',
    maxHeight: '100vh',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    background: '#111827',
    color: '#f9fafb',
    fontSize: '13px',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '-8px 0 32px rgba(0,0,0,0.35)',
    zIndex: '2147483647',
    pointerEvents: 'auto',
  });

  const headerBar = document.createElement('div');
  Object.assign(headerBar.style, {
    flexShrink: '0',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '16px 16px 12px',
    borderBottom: '1px solid #374151',
    background: '#0f172a',
  });

  const headerText = document.createElement('div');
  const nameEl = document.createElement('div');
  nameEl.textContent = detail.name || result.displayName || 'Professor';
  Object.assign(nameEl.style, { fontWeight: '700', fontSize: '16px', lineHeight: '1.3' });
  headerText.appendChild(nameEl);

  const subParts = [];
  if (result.course) subParts.push(result.course);
  if (detail.department) subParts.push(detail.department);
  if (subParts.length) {
    const sub = document.createElement('div');
    sub.textContent = subParts.join(' · ');
    Object.assign(sub.style, { color: '#9ca3af', fontSize: '12px', marginTop: '4px' });
    headerText.appendChild(sub);
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '✕';
  closeBtn.title = 'Close';
  Object.assign(closeBtn.style, {
    border: 'none',
    background: '#374151',
    color: '#f9fafb',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    flexShrink: '0',
  });
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hooks.onClose?.();
  });

  headerBar.append(headerText, closeBtn);
  panel.appendChild(headerBar);

  const body = document.createElement('div');
  Object.assign(body.style, {
    flex: '1',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '12px 16px 24px',
    WebkitOverflowScrolling: 'touch',
  });

  const hasRating = typeof result.overall === 'number';
  const hasGpa = typeof result.gpa === 'number';

  const scoreRow = document.createElement('div');
  Object.assign(scoreRow.style, {
    display: 'grid',
    gridTemplateColumns: hasRating && hasGpa ? '1fr 1fr' : '1fr',
    gap: '10px',
    marginBottom: '12px',
  });

  if (hasRating) {
    const rmpCard = document.createElement('div');
    Object.assign(rmpCard.style, {
      background: '#1f2937',
      borderRadius: '10px',
      padding: '12px',
      borderLeft: `4px solid ${colorFor(result.overall)}`,
    });
    const rmpLabel = document.createElement('div');
    rmpLabel.textContent = 'RMP rating';
    Object.assign(rmpLabel.style, { fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' });
    const rmpVal = document.createElement('div');
    rmpVal.textContent = `★ ${result.overall.toFixed(1)}`;
    Object.assign(rmpVal.style, { fontSize: '22px', fontWeight: '800', color: colorFor(result.overall), marginTop: '4px' });
    const rmpSub = document.createElement('div');
    rmpSub.textContent = result.sampleSize ? `${result.sampleSize} ratings` : 'RateMyProfessors';
    Object.assign(rmpSub.style, { fontSize: '11px', color: '#9ca3af', marginTop: '2px' });
    rmpCard.append(rmpLabel, rmpVal, rmpSub);
    scoreRow.appendChild(rmpCard);
  }

  if (hasGpa) {
    const gpaCard = document.createElement('div');
    Object.assign(gpaCard.style, {
      background: '#1f2937',
      borderRadius: '10px',
      padding: '12px',
      borderLeft: `4px solid ${gpaColor(result.gpa)}`,
    });
    const gpaLabel = document.createElement('div');
    gpaLabel.textContent = 'Course GPA';
    Object.assign(gpaLabel.style, { fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' });
    const gpaVal = document.createElement('div');
    gpaVal.textContent = result.gpa.toFixed(2);
    Object.assign(gpaVal.style, { fontSize: '22px', fontWeight: '800', color: gpaColor(result.gpa), marginTop: '4px' });
    const gpaSub = document.createElement('div');
    gpaSub.textContent = result.gpaSampleSize ? `${result.gpaSampleSize} sections` : 'This course';
    Object.assign(gpaSub.style, { fontSize: '11px', color: '#9ca3af', marginTop: '2px' });
    gpaCard.append(gpaLabel, gpaVal, gpaSub);
    scoreRow.appendChild(gpaCard);
  }

  body.appendChild(scoreRow);

  if (!hasRating && result.rmpStatus && result.rmpStatus !== 'staff_tba') {
    const rmpNote = document.createElement('div');
    const msg =
      result.rmpStatus === 'ambiguous'
        ? 'Multiple RateMyProfessors matches — use the profile link below if you know the right one.'
        : result.rmpStatus === 'fetch_failed'
          ? `Could not reach RateMyProfessors.${result.rmpErrorDetail ? ` (${result.rmpErrorDetail})` : ''}`
          : 'No confident RateMyProfessors match for this name.';
    rmpNote.textContent = msg;
    Object.assign(rmpNote.style, {
      fontSize: '12px',
      color: '#fbbf24',
      background: '#422006',
      padding: '8px 10px',
      borderRadius: '8px',
      marginBottom: '12px',
      lineHeight: '1.4',
    });
    body.appendChild(rmpNote);
  }

  const metricsSection = sectionBlock('Details');
  const table = document.createElement('table');
  Object.assign(table.style, {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  });
  const tbody = document.createElement('tbody');

  if (result.composite?.score != null) {
    tbody.appendChild(
      tableRow('Composite score', `${result.composite.score.toFixed(1)} / 5`, {
        valueColor: colorFor(result.composite.score),
      })
    );
  }
  if (result.reviewSentiment) {
    const s = result.reviewSentiment;
    const toneColor =
      s.tone === 'mostly positive' ? '#16a34a' : s.tone === 'mostly negative' ? '#dc2626' : '#ca8a04';
    tbody.appendChild(
      tableRow('Recent sentiment', `${s.tone} (${s.avg.toFixed(1)}/5, n=${s.count})`, { valueColor: toneColor })
    );
  }
  if (hasRating && result.difficulty !== undefined) {
    tbody.appendChild(tableRow('Difficulty', `${result.difficulty.toFixed(1)} / 5`));
  }
  if (detail.wouldTakeAgainPct !== undefined) {
    tbody.appendChild(tableRow('Would take again', `${detail.wouldTakeAgainPct}%`));
  }
  if (result.gpaDistribution) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = 'Grade distribution';
    Object.assign(th.style, {
      textAlign: 'left',
      color: '#9ca3af',
      padding: '6px 10px 6px 0',
      verticalAlign: 'top',
      fontWeight: '500',
    });
    const td = document.createElement('td');
    td.appendChild(gradeDistribution(result.gpaDistribution));
    Object.assign(td.style, { padding: '6px 0', textAlign: 'right' });
    tr.append(th, td);
    tbody.appendChild(tr);
  }

  if (tbody.children.length) {
    table.appendChild(tbody);
    metricsSection.appendChild(table);
    body.appendChild(metricsSection);
  }

  if (detail.tags?.length) {
    const tagSection = sectionBlock('Top tags');
    const tagWrap = document.createElement('div');
    Object.assign(tagWrap.style, { display: 'flex', flexWrap: 'wrap', gap: '6px' });
    detail.tags.forEach((t) => {
      const chip = document.createElement('span');
      chip.textContent = t;
      Object.assign(chip.style, {
        background: '#374151',
        borderRadius: '9999px',
        padding: '3px 10px',
        fontSize: '11px',
      });
      tagWrap.appendChild(chip);
    });
    tagSection.appendChild(tagWrap);
    body.appendChild(tagSection);
  }

  if (detail.reviews?.length) {
    const reviewSection = sectionBlock('Recent comments');
    const reviewHint = document.createElement('p');
    reviewHint.textContent = 'AI-shortened previews — open RateMyProfessors for full discussion.';
    Object.assign(reviewHint.style, { margin: '0 0 8px', fontSize: '11px', color: '#6b7280' });
    reviewSection.appendChild(reviewHint);

    /** @type {HTMLParagraphElement[]} */
    const reviewTextEls = [];

    for (const review of detail.reviews) {
      const card = document.createElement('article');
      Object.assign(card.style, {
        background: '#1f2937',
        borderRadius: '8px',
        padding: '10px',
        marginBottom: '8px',
      });
      const meta = document.createElement('div');
      Object.assign(meta.style, {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: '#9ca3af',
        marginBottom: '6px',
      });
      meta.textContent = review.class || 'Review';
      if (typeof review.quality === 'number') {
        const stars = document.createElement('span');
        stars.textContent = `★ ${review.quality}`;
        stars.style.color = colorFor(review.quality);
        stars.style.fontWeight = '700';
        meta.textContent = '';
        meta.append(document.createTextNode(review.class || 'Review'), stars);
      }
      const text = document.createElement('p');
      text.textContent = truncateComment(review.comment);
      Object.assign(text.style, {
        margin: '0',
        fontSize: '12px',
        lineHeight: '1.45',
        color: '#e5e7eb',
        display: '-webkit-box',
        webkitLineClamp: String(COMMENT_LINE_CLAMP),
        WebkitLineClamp: String(COMMENT_LINE_CLAMP),
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      });
      card.append(meta, text);
      reviewSection.appendChild(card);
      reviewTextEls.push(text);
    }

    hydrateReviewSummaries(detail.reviews, reviewTextEls);

    if (detail.profileUrl) {
      const jumpBtn = document.createElement('a');
      jumpBtn.href = detail.profileUrl;
      jumpBtn.target = '_blank';
      jumpBtn.rel = 'noopener noreferrer';
      jumpBtn.textContent = 'Read all reviews on RateMyProfessors →';
      Object.assign(jumpBtn.style, {
        display: 'block',
        textAlign: 'center',
        marginTop: '8px',
        padding: '8px',
        borderRadius: '8px',
        background: '#1e3a5f',
        color: '#93c5fd',
        textDecoration: 'none',
        fontSize: '12px',
        fontWeight: '600',
      });
      reviewSection.appendChild(jumpBtn);
    }
    body.appendChild(reviewSection);
  } else if (result.sampleSize > 0 && detail.profileUrl) {
    const reviewSection = sectionBlock('Reviews');
    const jumpBtn = document.createElement('a');
    jumpBtn.href = detail.profileUrl;
    jumpBtn.target = '_blank';
    jumpBtn.rel = 'noopener noreferrer';
    jumpBtn.textContent = 'View discussion on RateMyProfessors →';
    Object.assign(jumpBtn.style, { color: '#60a5fa', fontSize: '12px' });
    reviewSection.appendChild(jumpBtn);
    body.appendChild(reviewSection);
  }

  if (hooks.rawName && hooks.onMarkUpdate) {
    const marksSection = sectionBlock('Your take');
    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, { display: 'flex', gap: '8px', marginBottom: '8px' });
    for (const [label, value] of [
      ['👍 Like', 'like'],
      ['👎 Dislike', 'dislike'],
    ]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      const active = hooks.userMark?.sentiment === value;
      Object.assign(btn.style, {
        flex: '1',
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid #4b5563',
        background: active ? '#374151' : '#1f2937',
        color: '#f9fafb',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: active ? '700' : '500',
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = hooks.userMark?.sentiment === value ? null : value;
        hooks.onMarkUpdate?.({ sentiment: next });
      });
      btnRow.appendChild(btn);
    }
    marksSection.appendChild(btnRow);

    const takenLabel = document.createElement('label');
    Object.assign(takenLabel.style, { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', marginBottom: '8px' });
    const takenBox = document.createElement('input');
    takenBox.type = 'checkbox';
    takenBox.checked = !!hooks.userMark?.taken;
    takenLabel.append(takenBox, document.createTextNode("I've had this professor"));
    takenBox.addEventListener('change', () => hooks.onMarkUpdate?.({ taken: takenBox.checked }));
    marksSection.appendChild(takenLabel);

    const noteInput = document.createElement('textarea');
    noteInput.placeholder = 'Optional note';
    noteInput.value = hooks.userMark?.note || '';
    Object.assign(noteInput.style, {
      width: '100%',
      boxSizing: 'border-box',
      minHeight: '56px',
      padding: '8px',
      borderRadius: '8px',
      border: '1px solid #4b5563',
      background: '#1f2937',
      color: '#f9fafb',
      fontFamily: 'inherit',
      fontSize: '12px',
      resize: 'vertical',
    });
    noteInput.addEventListener('change', () => hooks.onMarkUpdate?.({ note: noteInput.value }));
    marksSection.appendChild(noteInput);
    body.appendChild(marksSection);
  }

  if (hooks.rawName && hooks.onBlockToggle) {
    const actions = sectionBlock('Actions');
    const blockBtn = document.createElement('button');
    blockBtn.type = 'button';
    blockBtn.textContent = hooks.isBlocked ? 'Unhide this professor' : 'Hide this professor';
    Object.assign(blockBtn.style, {
      width: '100%',
      padding: '10px',
      borderRadius: '8px',
      border: 'none',
      background: hooks.isBlocked ? '#374151' : '#7f1d1d',
      color: '#fff',
      fontWeight: '600',
      cursor: 'pointer',
      fontFamily: 'inherit',
    });
    blockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hooks.onBlockToggle?.(!hooks.isBlocked);
    });
    actions.appendChild(blockBtn);
    body.appendChild(actions);
  }

  if (detail.profileUrl) {
    const footer = document.createElement('div');
    Object.assign(footer.style, { marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #374151' });
    const link = document.createElement('a');
    link.href = detail.profileUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open RateMyProfessors profile →';
    Object.assign(link.style, { color: '#60a5fa', fontSize: '12px', textDecoration: 'none' });
    footer.appendChild(link);
    body.appendChild(footer);
  }

  panel.appendChild(body);

  panel.addEventListener('click', (e) => e.stopPropagation());

  return { root: panel, backdrop };
}
