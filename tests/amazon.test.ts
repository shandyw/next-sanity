import { EditorialLink } from '../components/EditorialLink';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  experienceStatus,
  ordinaryAmazonUrl,
  validAmazonAffiliateUrl,
} from '../lib/amazon';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Settings } from '../lib/types';

const active: Settings = { amazonAssociates: { active: true, tag: 'site-20' } };
const source = 'https://www.amazon.com/dp/B0C5R6Q2XZ?tag=old-20';

test('Amazon URL validation keeps ordinary and approved affiliate links separate', () => {
  assert.equal(ordinaryAmazonUrl(source), 'https://www.amazon.com/dp/B0C5R6Q2XZ');
  assert.equal(ordinaryAmazonUrl('https://amzn.to/abc123'), undefined);
  assert.equal(validAmazonAffiliateUrl('https://amazon.com.evil.test/?tag=site-20', 'site-20'), undefined);
  assert.equal(validAmazonAffiliateUrl('https://amzn.to/abc123', 'site-20'), undefined);
  assert.equal(validAmazonAffiliateUrl('https://amzn.to/abc123', 'site-20', true), 'https://amzn.to/abc123');
});

test('review and guide links use ordinary URLs until Associates is active', () => {
  const props = { href: source, affiliate: true, sourceId: 'review', placement: 'review' as const, children: 'See the blouse' };
  const ordinary = renderToStaticMarkup(EditorialLink(props));
  assert.match(ordinary, /See the blouse.*Amazon/);
  assert.doesNotMatch(ordinary, /tag=|sponsored|paid link/);
  const affiliate = renderToStaticMarkup(EditorialLink({ ...props, settings: active }));
  assert.match(affiliate, /tag=site-20/);
  assert.match(affiliate, /sponsored/);
  const mismatch = renderToStaticMarkup(EditorialLink({ ...props, settings: active, affiliateHref: 'https://www.amazon.com/dp/B0ABC12345?tag=site-20' }));
  assert.doesNotMatch(mismatch, /B0ABC12345/);
  assert.equal(experienceStatus({ experienceStatus: 'mannequin' }), 'mannequin');
});
