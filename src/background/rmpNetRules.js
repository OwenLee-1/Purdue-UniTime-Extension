// Chrome MV3 service workers send Origin: chrome-extension://… on fetch, which
// can cause RMP's GraphQL edge to reject requests. Rewrite to the site origin.
//
// Cookie stripping is only for extension-initiated GraphQL (oversized Cookie
// jars caused RMP 400s). Never apply it to RateMyProfessors itself — the static
// DNR rule has host access to that site, so an unscoped cookie-remove logs the
// user out of RMP GraphQL (search, ratings, "leave a rating") while the HTML
// session cookie still loads the logged-in shell.

const RMP_GRAPHQL_RULE_ID = 1;

/** First-party RMP pages must keep their GraphQL cookies. */
export const RMP_SITE_INITIATOR_DOMAINS = ['ratemyprofessors.com', 'www.ratemyprofessors.com'];

/**
 * Header rewrite used by the dynamic DNR rule (mirrors rules/rmp_headers.json).
 * @returns {chrome.declarativeNetRequest.Rule}
 */
export function rmpGraphqlHeaderRule() {
  return {
    id: RMP_GRAPHQL_RULE_ID,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [
        { header: 'Origin', operation: 'set', value: 'https://www.ratemyprofessors.com' },
        { header: 'Referer', operation: 'set', value: 'https://www.ratemyprofessors.com/' },
      ],
    },
    condition: {
      urlFilter: '||ratemyprofessors.com/graphql',
      resourceTypes: ['xmlhttprequest', 'other'],
      excludedInitiatorDomains: [...RMP_SITE_INITIATOR_DOMAINS],
    },
  };
}

/**
 * @returns {Promise<void>}
 */
export async function ensureRmpRequestHeaders() {
  if (!chrome.declarativeNetRequest?.updateDynamicRules) return;

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RMP_GRAPHQL_RULE_ID],
    addRules: [rmpGraphqlHeaderRule()],
  });
}
