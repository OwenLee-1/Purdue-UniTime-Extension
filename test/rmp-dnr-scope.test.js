import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { rmpGraphqlHeaderRule, RMP_SITE_INITIATOR_DOMAINS } from '../src/background/rmpNetRules.js';

const here = dirname(fileURLToPath(import.meta.url));
const staticRules = JSON.parse(readFileSync(join(here, '..', 'rules', 'rmp_headers.json'), 'utf8'));

function cookieOps(rule) {
  return (rule.action?.requestHeaders || []).filter((h) => h.header.toLowerCase() === 'cookie');
}

test('static DNR rule still strips cookies on extension GraphQL fetches', () => {
  assert.equal(staticRules.length, 1);
  const rule = staticRules[0];
  const cookie = cookieOps(rule);
  assert.equal(cookie.length, 1);
  assert.equal(cookie[0].operation, 'remove');
  assert.equal(rule.condition.urlFilter, '||ratemyprofessors.com/graphql');
});

test('static DNR rule does not strip cookies from RateMyProfessors itself', () => {
  const excluded = staticRules[0].condition.excludedInitiatorDomains || [];
  for (const domain of ['ratemyprofessors.com', 'www.ratemyprofessors.com']) {
    assert.ok(
      excluded.includes(domain),
      `expected excludedInitiatorDomains to include ${domain}, got ${JSON.stringify(excluded)}`
    );
  }
});

test('dynamic DNR rule matches the same RMP-initiator exclusion', () => {
  const rule = rmpGraphqlHeaderRule();
  assert.deepEqual(rule.condition.excludedInitiatorDomains, [...RMP_SITE_INITIATOR_DOMAINS]);
  for (const domain of ['ratemyprofessors.com', 'www.ratemyprofessors.com']) {
    assert.ok(rule.condition.excludedInitiatorDomains.includes(domain));
  }
});
