import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pricingProviderError } from '../lib/pricing/provider-errors';
import {
  defaultInputs,
  pricingInputsSchema,
  requestSchema,
  type Comparable,
} from '../lib/pricing/contracts';
import {
  financials,
  checkedAssessment,
  marketWarning,
  eligibleItem,
  itemAvailable,
  moneyToCents,
} from '../lib/pricing/engine';
import {
  bearerToken,
  requirePricingAdmin,
  requirePrivateDataset,
  limitedRequestText,
} from '../lib/pricing/security';
const comp: Comparable = {
  id: 'c1',
  source: 'Manual marketplace',
  url: 'https://example.test/item',
  description: 'Linen blouse',
  brandModel: 'Acme',
  size: '16',
  condition: 'Good',
  priceCents: 1000,
  currency: 'USD',
  kind: 'confirmedSold',
  shippingCents: null,
  observedAt: '2026-10-01',
  soldAt: '2026-10-01',
  differences: 'Similar',
  relevant: true,
};
const assessment = {
  lowCents: 800,
  highCents: 1200,
  listingCents: 1200,
  quickCents: 900,
  features: [],
  warnings: [],
  explanation: 'Supplied evidence only',
  evidence: [{ id: 'c1', relevant: true, reason: 'Similar item' }],
};
test('provider failures explain billing, access, request and connection problems without exposing raw errors', () => {
  assert.equal(pricingProviderError({ status: 429, code: 'insufficient_quota' }).status, 402);
  assert.match(
    pricingProviderError({ status: 429, code: 'insufficient_quota' }).message,
    /billing/,
  );
  assert.match(pricingProviderError({ status: 401 }).message, /OPENAI_API_KEY/);
  assert.match(pricingProviderError({ status: 403 }).message, /permissions/);
  assert.match(pricingProviderError({ status: 404 }).message, /PRICING_AI_MODEL/);
  assert.equal(pricingProviderError({ status: 429 }).status, 429);
  assert.equal(pricingProviderError({ name: 'APIConnectionTimeoutError' }).status, 504);
  assert.match(pricingProviderError({ name: 'APIConnectionError' }).message, /network/);
  assert.match(
    pricingProviderError({ status: 400, code: 'invalid_json_schema' }).message,
    /schema compatibility/,
  );
  assert.match(pricingProviderError({ status: 400 }).message, /image inputs/);
  assert.doesNotMatch(
    pricingProviderError(new Error('private submitted data')).message,
    /private submitted data/,
  );
});
test('pricing uses integer cents, rounds floors up and never treats unknown acquisition as zero', () => {
  const inputs = {
    ...defaultInputs,
    acquisitionCents: 1000,
    cleaningCents: 101,
    packagingCents: 33,
    shippingCents: 125,
    promotionCents: 20,
    overheadCents: 21,
    desiredProfitCents: 500,
    fixedFeeCents: 30,
    sellerFeeBps: 1250,
  };
  const result = financials(inputs, 2100);
  assert.equal(result.floorCents, Math.ceil((1000 + 300 + 30 + 500) / 0.875));
  assert.ok(financials(inputs, result.floorCents!).profitCents! >= 500);
  assert.ok(financials(inputs, result.floorCents! - 1).profitCents! < 500);
  assert.equal(result.netCents, 1507);
  assert.equal(result.profitCents, 507);
  const unknown = financials({ ...inputs, acquisitionCents: null }, 2100);
  assert.equal(unknown.profitCents, null);
  assert.equal(unknown.floorCents, null);
  assert.equal(unknown.netCents, 1507);
  assert.throws(() => financials({ ...inputs, sellerFeeBps: 10000 }, 2100));
  assert.throws(() => financials({ ...inputs, shippingCents: -1 }, 2100));
  assert.throws(() => financials(inputs, 1.5));
  assert.equal(moneyToCents('0.01'), 1);
  assert.equal(moneyToCents('001.20'), 120);
  assert.equal(moneyToCents(''), null);
  assert.throws(() => moneyToCents('1.005'));
});
test('market evidence is separate from profit floor and references must resolve', () => {
  const inputs = {
    ...defaultInputs,
    acquisitionCents: 2000,
    desiredProfitCents: 500,
    comparables: [comp],
  };
  const checked = checkedAssessment(assessment, inputs, 'USD', Date.parse('2026-10-11'));
  assert.equal(checked.assessment.highCents, 1200);
  assert.equal(checked.confidence, 'moderate');
  assert.equal(
    marketWarning(inputs, checked.assessment),
    'Unlikely to meet your profit target at current market prices.',
  );
  assert.throws(() =>
    checkedAssessment(
      { ...assessment, evidence: [{ id: 'invented', relevant: true, reason: 'Fake' }] },
      inputs,
      'USD',
    ),
  );
  const incompatible = checkedAssessment(assessment, inputs, 'GBP');
  assert.equal(incompatible.assessment.listingCents, null);
  assert.equal(incompatible.confidence, 'limited');
  const weak = checkedAssessment(
    assessment,
    { ...inputs, comparables: [{ ...comp, relevant: false }] },
    'USD',
  );
  assert.equal(weak.assessment.lowCents, null);
  const asking = checkedAssessment(
    assessment,
    { ...inputs, comparables: [{ ...comp, kind: 'asking' }] },
    'USD',
    Date.parse('2026-10-11'),
  );
  assert.equal(asking.confidence, 'limited');
  assert.ok(asking.assessment.warnings.some((w) => w.includes('not confirmed')));
  assert.ok(checked.assessment.warnings.some((w) => w.includes('Shipping')));
});
test('private storage, authenticated admin authorization and limits fail closed', async () => {
  assert.throws(() => bearerToken(new Request('http://localhost')));
  assert.throws(() => requirePricingAdmin('viewer', 'admin'));
  assert.throws(() => requirePricingAdmin('admin', ''));
  assert.doesNotThrow(() => requirePricingAdmin('admin', 'admin'));
  assert.throws(() =>
    requirePrivateDataset('production', 'production', [{ name: 'production', aclMode: 'private' }]),
  );
  assert.throws(() =>
    requirePrivateDataset('pricing', 'production', [{ name: 'pricing', aclMode: 'public' }]),
  );
  assert.doesNotThrow(() =>
    requirePrivateDataset('pricing', 'production', [{ name: 'pricing', aclMode: 'private' }]),
  );
  await assert.rejects(
    () =>
      limitedRequestText(
        new Request('http://localhost', { method: 'POST', body: 'a'.repeat(100001) }),
      ),
    /100 KB/,
  );
  assert.equal(
    await limitedRequestText(new Request('http://localhost', { method: 'POST', body: '{}' })),
    '{}',
  );
});
test('closet-only eligibility, sold restrictions and explicit approval are enforced', () => {
  assert.equal(eligibleItem({}), true);
  assert.equal(eligibleItem({ shoppingSection: 'finds' }), false);
  assert.equal(eligibleItem({ affiliateLink: true }), false);
  assert.equal(
    itemAvailable({ _id: 'x', _rev: 'r', _type: 'product', availability: 'sold' }),
    false,
  );
  assert.equal(
    itemAvailable({ _id: 'x', _rev: 'r', _type: 'product', availability: 'available' }),
    true,
  );
  assert.equal(
    pricingInputsSchema.safeParse({ ...defaultInputs, acquisitionCents: undefined }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      action: 'apply',
      requestId: crypto.randomUUID(),
      analysisId: 'pricing-analysis-' + 'a'.repeat(64),
      expectedRevision: 'r',
      chosenCents: 1000,
      inputs: defaultInputs,
      reviewedOutdated: false,
      approved: false,
    }).success,
    false,
  );
});
