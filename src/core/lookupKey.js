// Shared cache/message keys for professor+course lookups (content + background).

import { normalizeCourseKey } from './courseKey.js';
import { normalizeName } from './matching.js';

/**
 * @param {{ rawName: string, school?: string, course?: string }} query
 * @returns {string}
 */
export function lookupKey(query) {
  const n = normalizeName(query.rawName);
  if (n.isPlaceholder || !n.last) return '';
  const course = normalizeCourseKey(query.course) || '';
  return `${query.school || 'purdue'}:${n.last}:${n.first}::${course}`;
}
