import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { localDemoProducts } from '../lib/demo-products';
import { browse } from '../lib/browse';
import { ProductAction } from '../components/ProductAction';
const enabled = { NODE_ENV: 'development', ENABLE_DEMO_CONTENT: 'true' };

test('shop samples require an empty local closet and never appear in production', () => {
  const samples = localDemoProducts([], enabled);
  assert.equal(samples.length, 16);
  assert.ok(
    samples.every((d) => d.demo && !d.vintedUrl && d.photos?.[0]?.demoSrc === '/img/curvy.png'),
  );
  assert.deepEqual(localDemoProducts([], { ...enabled, NODE_ENV: 'production' }), []);
  assert.deepEqual(localDemoProducts([], { ...enabled, ENABLE_DEMO_CONTENT: 'false' }), []);
  const real = [{ ...samples[0], demo: false }];
  assert.equal(localDemoProducts(real, enabled), real);
});
test('shop samples exercise complete-dataset filters, sorting, pagination, and safe actions', () => {
  const samples = localDemoProducts([], enabled);
  const first = browse(samples, {}, true);
  const second = browse(samples, { page: '2' }, true);
  assert.equal(first.count, 16);
  assert.equal(first.pages, 2);
  assert.equal(first.items.length, 12);
  assert.equal(second.items.length, 4);
  assert.equal(new Set([...first.items, ...second.items].map((d) => d._id)).size, 16);
  for (const availability of ['available', 'reserved', 'sold', 'unknown'])
    assert.equal(browse(samples, { availability }, true).count, 4);
  assert.equal(browse(samples, { q: 'jeans' }, true).count, 2);
  assert.equal(browse(samples, { category: 'tops', size: '18' }, true).count, 2);
  assert.equal(browse(samples, { q: 'no matching sample' }, true).count, 0);
  assert.equal(browse(samples, { sort: 'price_desc' }, true).items[0].listingPrice, 47.5);
  for (const product of samples) {
    const html = renderToStaticMarkup(createElement(ProductAction, { product }));
    assert.doesNotMatch(html, /<a\b/);
    assert.match(html, /Local sample only/);
    if (product.availability === 'available') assert.match(html, /<button[^>]*disabled/);
    else assert.doesNotMatch(html, /<button/);
  }
});
