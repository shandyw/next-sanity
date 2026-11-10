import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewAmazonCta } from '../lib/review-cta';
import { articlePublicFields } from '../lib/public-projection';
import { vercelStegaCombine } from '@vercel/stega';

test('Review Amazon CTA uses a singular linked Find category', () => {
  assert.equal(reviewAmazonCta({ title: 'Sweaters' }), 'Shop this sweater on Amazon');
  assert.equal(reviewAmazonCta({ title: 'Dresses' }), 'Shop this dress on Amazon');
  assert.equal(reviewAmazonCta({ title: 'Jeans' }), 'Shop this pair of jeans on Amazon');
  assert.equal(reviewAmazonCta({ title: 'Crop Tops' }), 'Shop this crop top on Amazon');
  assert.equal(
    reviewAmazonCta({ title: vercelStegaCombine('Tank Tops', { origin: 'sanity' }) }),
    'Shop this tank top on Amazon',
  );
  assert.equal(reviewAmazonCta(), 'Shop this item on Amazon');
  assert.match(articlePublicFields, /"primaryFind":primaryFind->\{[^}]*"category":category->/);
});
