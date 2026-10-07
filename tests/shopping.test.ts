import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { shoppingSection, sectionProducts, shoppingPrice } from '../lib/shopping';
import { browse } from '../lib/browse';
import { ProductAction } from '../components/ProductAction';
import type { DocumentContent } from '../lib/types';
const closet: DocumentContent = {
  _id: 'closet',
  _type: 'product',
  title: 'Blouse',
  slug: 'blouse',
  size: '16',
  condition: 'Good',
  listingPrice: 12,
  currency: 'USD',
  availability: 'available',
  vintedUrl: 'https://www.vinted.com/items/123-blouse',
  categories: [{ _id: 'tops', slug: 'tops', title: 'Tops' }],
};
const find: DocumentContent = {
  _id: 'find',
  _type: 'product',
  title: 'Dress',
  slug: 'dress',
  shoppingSection: 'finds',
  availableSizes: ['16', '18'],
  retailer: 'Example retailer',
  purchaseUrl: 'https://example.com/dress',
  listingPrice: 40,
  currency: 'USD',
  categories: [{ _id: 'dresses', slug: 'dresses', title: 'Dresses' }],
};

test('existing products stay in closet; curated sections, prices, and filters are independent', () => {
  assert.equal(shoppingSection(closet), 'closet');
  assert.deepEqual(
    sectionProducts([closet, find], 'closet').map((p) => p._id),
    ['closet'],
  );
  assert.equal(shoppingPrice(find), undefined);
  assert.equal(shoppingPrice({ ...find, priceMaintained: true }), 40);
  const finds = sectionProducts([closet, find], 'finds');
  assert.equal(
    browse(finds, { size: '18', retailer: 'Example retailer', tried: 'no' }, true).count,
    1,
  );
  assert.equal(browse(finds, { category: 'tops' }, true).count, 0);
  assert.equal(browse(finds, { tried: 'yes' }, true).count, 0);
  assert.equal(browse([closet], { condition: 'Good', size: '16' }, true).count, 1);
});

test('curated links are distinct from Vinted; affiliate disclosures are conditional', () => {
  const render = (product: DocumentContent) =>
    renderToStaticMarkup(React.createElement(ProductAction, { product }));
  assert.match(render(find), /Shop at Example retailer/);
  assert.doesNotMatch(render(find), /Affiliate link/);
  assert.match(render({ ...find, affiliateLink: true }), /Affiliate link/);
  assert.match(render({ ...find, affiliateLink: true }), /sponsored/);
  assert.doesNotMatch(render({ ...find, availability: 'sold' }), /href=/);
  assert.doesNotMatch(render({ ...find, purchaseUrl: 'javascript:alert(1)' }), /href=/);
  const both = {
    ...closet,
    newPurchaseUrl: 'https://example.com/new-blouse',
    newRetailer: 'Example retailer',
    newAffiliateLink: true,
  };
  assert.match(render(both), /Buy mine on Vinted/);
  assert.match(render(both), /Shop new at Example retailer/);
  assert.doesNotMatch(render({ ...both, availability: 'sold' }), /Buy mine on Vinted/);
  assert.match(render({ ...both, availability: 'sold' }), /Shop new at Example retailer/);
});
