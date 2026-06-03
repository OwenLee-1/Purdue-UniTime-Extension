// A simple list of which providers are currently active.
//
// Today it's just RateMyProfessors. When we add grade distributions or Reddit
// sentiment later, we import them here and add them to the array — nothing else
// in the codebase needs to change.

import { RmpProvider } from './rmpProvider.js';

/** @type {import('./Provider.js').RatingProvider[]} */
export const providers = [new RmpProvider()];

/**
 * Find an active provider by its id.
 * @param {"rmp"|"grades"|"reddit"} id
 * @returns {import('./Provider.js').RatingProvider | undefined}
 */
export function getProvider(id) {
  return providers.find((p) => p.id === id);
}
