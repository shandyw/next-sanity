import test from 'node:test';
import assert from 'node:assert/strict';
import { acquisitionDisclosure } from '../lib/review-transparency';
import { findAmazonLink } from '../lib/find-amazon-link';
import type { Settings } from '../lib/types';

test('Review acquisition language follows only the explicitly entered source', () => {
  assert.equal(acquisitionDisclosure({}), undefined);
  assert.match(acquisitionDisclosure({ acquisitionSource: 'selfPurchased' })!, /own money/);
  assert.match(acquisitionDisclosure({ acquisitionSource: 'brandGift' })!, /gifted by the brand/);
  assert.match(
    acquisitionDisclosure({ acquisitionSource: 'providedForReview' })!,
    /provided for review/,
  );
  assert.match(acquisitionDisclosure({ acquisitionSource: 'borrowed' })!, /borrowed/);
  assert.equal(
    acquisitionDisclosure({
      acquisitionSource: 'other',
      acquisitionNote: '  Loaned by a friend.  ',
    }),
    'Loaned by a friend.',
  );
  assert.equal(acquisitionDisclosure({ acquisitionSource: 'other' }), undefined);
});

test('Review shopping eligibility requires a valid affiliate link and available Find', () => {
  const settings = { amazonAssociates: { active: true, tag: 'curvygirl-20' } } as Settings;
  const base = { _id: 'find-1', title: 'Jeans', amazonUrl: 'https://www.amazon.com/dp/B0ABC12345' };
  assert.equal(findAmazonLink(base, settings)?.affiliate, false);
  assert.equal(
    findAmazonLink({ ...base, affiliateUrl: 'https://example.com/product' }, settings)?.affiliate,
    false,
  );
  assert.deepEqual(
    findAmazonLink(
      { ...base, affiliateUrl: 'https://www.amazon.com/dp/B0ABC12345?tag=curvygirl-20' },
      settings,
    ),
    { href: 'https://www.amazon.com/dp/B0ABC12345?tag=curvygirl-20', affiliate: true },
  );
  assert.equal(
    findAmazonLink(
      {
        ...base,
        linkStatus: 'unavailable',
        affiliateUrl: 'https://www.amazon.com/dp/B0ABC12345?tag=curvygirl-20',
      },
      settings,
    ),
    undefined,
  );
});
