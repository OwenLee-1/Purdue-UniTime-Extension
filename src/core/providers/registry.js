// A simple list of which providers are currently active.
//
// v1 shipped RateMyProfessors only; we now also have a grade-distribution (GPA)
// provider. Adding more later (Reddit sentiment, etc.) is just another import +
// array entry — nothing else in the codebase changes.

import { RmpProvider } from './rmpProvider.js';
import { GradesProvider } from './gradesProvider.js';

/** @type {import('./Provider.js').RatingProvider[]} */
export const providers = [new RmpProvider(), new GradesProvider()];

/**
 * Find an active provider by its id.
 * @param {"rmp"|"grades"|"reddit"} id
 * @returns {import('./Provider.js').RatingProvider | undefined}
 */
export function getProvider(id) {
  return providers.find((p) => p.id === id);
}
