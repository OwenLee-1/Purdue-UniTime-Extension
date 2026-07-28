// RMP cache/dedupe identity — full names can share across courses; initials cannot.

import { professorKey } from './blocks.js';
import { normalizeCourseKey } from './courseKey.js';
import { normalizeName } from './matching.js';

/**
 * UniTime often shows "H Wang" / "P P Cunningham". Those short first tokens match
 * many RMP profiles equally, and department hints make the correct pick course-
 * dependent — so RMP results must not be shared across courses.
 * @param {string} rawName
 * @returns {boolean}
 */
export function rmpIdentityNeedsCourse(rawName) {
  const n = normalizeName(rawName);
  if (n.isPlaceholder || !n.last) return false;
  return !n.first || n.first.length <= 2;
}

/**
 * Stable key for RMP fetch dedupe + persistent cache.
 * Full first names → professorKey; initial-only → professorKey::course.
 * @param {{ rawName: string, school?: string, course?: string }} query
 * @returns {string}
 */
export function rmpCacheIdentityKey(query) {
  const school = query.school || 'purdue';
  const pk = professorKey(query.rawName, school);
  if (!pk) return '';
  if (!rmpIdentityNeedsCourse(query.rawName)) return pk;
  const course = normalizeCourseKey(query.course) || '';
  return `${pk}::${course}`;
}
