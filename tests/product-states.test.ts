import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductAction } from '../components/ProductAction';
import type { DocumentContent } from '../lib/types';
const product: DocumentContent = {
  _id: 'fixture',
  _type: 'product',
  title: 'Test product',
  slug: 'fixture',
  vintedUrl: 'https://www.vinted.com/items/123-test',
};
const markup = (changes: Partial<DocumentContent>) =>
  renderToStaticMarkup(createElement(ProductAction, { product: { ...product, ...changes } }));
test('sold and reserved products never render a purchase action or product-state label', () => {
  for (const state of ['sold', 'reserved'] as const) {
    const html = markup({ availability: state });
    assert.ok(!html.includes('Buy on Vinted'));
    assert.ok(!html.includes('product-state'));
  }
});
test('only available products with valid listing URLs offer purchase and stale checks remain visible', () => {
  const available = markup({ availability: 'available' });
  assert.match(available, /Buy on Vinted/);
  assert.match(available, /not been checked recently/);
  assert.ok(!markup({ availability: 'unknown' }).includes('Buy on Vinted'));
  assert.ok(
    !markup({ availability: 'available', vintedUrl: 'https://untrusted.test/items/123' }).includes(
      'Buy on Vinted',
    ),
  );
});
