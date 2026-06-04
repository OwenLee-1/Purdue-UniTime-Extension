// Chrome MV3 service workers send Origin: chrome-extension://… on fetch, which
// can cause RMP's GraphQL edge to reject requests. Rewrite to the site origin.

const RMP_GRAPHQL_RULE_ID = 1;

/**
 * @returns {Promise<void>}
 */
export async function ensureRmpRequestHeaders() {
  if (!chrome.declarativeNetRequest?.updateDynamicRules) return;

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RMP_GRAPHQL_RULE_ID],
    addRules: [
      {
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
        },
      },
    ],
  });
}
