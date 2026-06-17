// Which RMP numbers to show when a UniTime course is in context.

/**
 * @typedef {import('./providers/Provider.js').ProviderResult} ProviderResult
 * @typedef {Object} DisplayRmp
 * @property {number} [overall]
 * @property {number} [difficulty]
 * @property {number} [sampleSize]
 * @property {'course' | 'all'} scope
 * @property {string} [courseLabel]
 * @property {number} [overallAllClasses]
 * @property {number} [sampleSizeAllClasses]
 * @property {boolean} showRating  Whether to show an RMP star at all
 */

/**
 * @param {ProviderResult} [result]
 * @returns {DisplayRmp}
 */
export function pickDisplayRmp(result) {
  const courseRmp = result?.courseRmp;
  const courseLabel = result?.course || courseRmp?.courseKey;

  if (courseRmp?.hasEnoughForAverage && Number.isFinite(courseRmp.overall)) {
    return {
      overall: courseRmp.overall,
      difficulty: courseRmp.difficulty,
      sampleSize: courseRmp.sampleSize,
      scope: 'course',
      courseLabel,
      overallAllClasses: result?.overall,
      sampleSizeAllClasses: result?.sampleSize,
      showRating: true,
    };
  }

  if (typeof result?.overall === 'number' && Number.isFinite(result.overall)) {
    return {
      overall: result.overall,
      difficulty: result.difficulty,
      sampleSize: result.sampleSize,
      scope: 'all',
      courseLabel,
      showRating: true,
    };
  }

  return { scope: 'all', courseLabel, showRating: false };
}

/**
 * @param {ProviderResult} [result]
 * @returns {string}
 */
export function displayRmpTitle(result) {
  const d = pickDisplayRmp(result);
  if (!d.showRating || d.overall == null) return 'Hover for preview · click for full details';
  if (d.scope === 'course' && d.courseLabel) {
    let title = `★ ${d.overall.toFixed(1)} for ${d.courseLabel} on RateMyProfessors (${d.sampleSize} review${d.sampleSize === 1 ? '' : 's'})`;
    if (typeof d.overallAllClasses === 'number') {
      title += `\nAll classes: ★ ${d.overallAllClasses.toFixed(1)} (${d.sampleSizeAllClasses || '?'} ratings)`;
    }
    return `${title}\nHover for preview · click for full details`;
  }
  return 'Hover for preview · click for full details';
}
