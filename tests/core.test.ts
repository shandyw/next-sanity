import { test } from 'node:test';
import assert from 'node:assert/strict';
import { browse, archiveUrl } from '../lib/browse';
import {
  importRecordSchema,
  importEnvelopeSchema,
  stableProductId,
  createProduct,
  listingUpdate,
  updateDecision,
} from '../lib/import-products';
import { vintedUrl, isStale } from '../lib/urls';
import { submissionSchema } from '../lib/forms';
import type { DocumentContent } from '../lib/types';
const collection: DocumentContent[] = Array.from({ length: 31 }, (_, i) => ({
  _id: `r${i}`,
  _type: 'review',
  slug: `r${i}`,
  title: `Review ${String(i).padStart(2, '0')}`,
  excerpt: i % 2 ? 'stretch jeans' : 'cotton dress',
  publishedAt: `2026-09-${String((i % 28) + 1).padStart(2, '0')}T12:00:00Z`,
  categories: [
    {
      _id: i % 2 ? 'jeans' : 'dresses',
      slug: i % 2 ? 'jeans' : 'dresses',
      title: i % 2 ? 'Jeans' : 'Dresses',
    },
  ],
  sizeWorn: i % 2 ? '16' : '18',
  priceWhenReviewed: i,
  reviewCurrency: 'USD',
  format: 'written',
}));
test('filter complete dataset before pagination and retain URL state', () => {
  const result = browse(collection, {
    q: 'stretch',
    category: 'jeans',
    size: '16',
    sort: 'price_desc',
    page: '2',
  });
  assert.equal(result.count, 15);
  assert.equal(result.pages, 2);
  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].priceWhenReviewed, 5);
  const url = archiveUrl(
    '/reviews',
    { q: 'stretch jeans', category: ['jeans', 'dresses'], sort: 'price_desc' },
    2,
  );
  assert.equal(new URL(url, 'https://example.test').searchParams.getAll('category').length, 2);
  assert.match(url, /page=2/);
});
test('invalid pages clamp and empty states stay deterministic', () => {
  assert.equal(browse(collection, { page: '999' }).page, 3);
  assert.equal(browse(collection, { page: 'NaN' }).page, 1);
  assert.equal(browse(collection, { q: 'not present' }).count, 0);
  assert.equal(browse(collection, { min_price: '10', max_price: '12' }).count, 3);
});
test('shop availability and historical reviewed prices use separate fields', () => {
  const d: DocumentContent = {
    ...collection[0],
    _type: 'product',
    availability: 'sold',
    listingPrice: 4,
    priceWhenReviewed: 100,
  };
  assert.equal(browse([d], { max_price: '5' }, true).count, 1);
  assert.equal(browse([d], { max_price: '5' }).count, 0);
  assert.equal(browse([d], { availability: 'available' }, true).count, 0);
});
const record = {
  externalListingId: '123',
  title: 'Owned jacket',
  listingPrice: 20,
  currency: 'USD',
  availability: 'available',
  vintedUrl: 'https://www.vinted.com/items/123-jacket',
  lastSuccessfullyCheckedAt: '2026-09-01T12:00:00Z',
};
test('import validates IDs, prices, URLs, and rejects unknown editorial fields', () => {
  assert.ok(importRecordSchema.safeParse(record).success);
  for (const change of [
    { vintedUrl: 'http://127.0.0.1/private' },
    { vintedUrl: 'https://vinted.com.evil.test/items/1' },
    { listingPrice: -1 },
    { externalListingId: '../bad' },
    { body: 'overwrite review' },
    { lastSuccessfullyCheckedAt: '2099-01-01T00:00:00Z' },
    { photoAssetRefs: [{ assetRef: 'https://untrusted.test/image.jpg', alt: 'x' }] },
  ])
    assert.equal(importRecordSchema.safeParse({ ...record, ...change }).success, false);
  assert.equal(
    importEnvelopeSchema.safeParse({ version: 2, source: 'x', products: [] }).success,
    false,
  );
});
test('stable IDs, manual ownership, reruns, stale snapshots and field ownership', () => {
  const r = importRecordSchema.parse(record);
  const id = stableProductId('feed', r.externalListingId);
  assert.equal(id, stableProductId('feed', r.externalListingId));
  assert.notEqual(id, stableProductId('other', r.externalListingId));
  const created = createProduct('feed', r);
  assert.equal(created._id, id);
  const existing = {
    _id: id,
    _rev: 'rev',
    dataSource: 'import',
    importSource: 'feed',
    externalListingId: '123',
    importEnabled: true,
    lastSuccessfullyCheckedAt: '2026-08-01T00:00:00Z',
  };
  assert.equal(updateDecision(existing, 'feed', r), 'update');
  assert.equal(
    updateDecision({ ...existing, importEnabled: false }, 'feed', r),
    'manual ownership',
  );
  assert.equal(
    updateDecision({ ...existing, dataSource: 'manual' }, 'feed', r),
    'identity mismatch',
  );
  assert.equal(
    updateDecision(
      { ...existing, lastSuccessfullyCheckedAt: r.lastSuccessfullyCheckedAt },
      'feed',
      r,
    ),
    'unchanged or older snapshot',
  );
  assert.deepEqual(Object.keys(listingUpdate(r)).sort(), [
    'availability',
    'currency',
    'lastSuccessfullyCheckedAt',
    'listingPrice',
    'vintedUrl',
  ]);
});
test('external URLs and stale availability are conservative', () => {
  assert.equal(vintedUrl('javascript:alert(1)'), undefined);
  assert.equal(
    vintedUrl('https://www.vinted.com/items/123-jacket?tracking=1'),
    'https://www.vinted.com/items/123-jacket',
  );
  assert.equal(isStale(undefined), true);
  assert.equal(isStale('invalid'), true);
  assert.equal(isStale('2026-09-01T00:00:00Z', Date.parse('2026-09-02T00:00:00Z')), false);
});
test('form validation rejects spam and invalid submissions', () => {
  assert.ok(
    submissionSchema.safeParse({ kind: 'newsletter', email: 'reader@example.test', website: '' })
      .success,
  );
  assert.equal(submissionSchema.safeParse({ kind: 'newsletter', email: 'bad' }).success, false);
  assert.equal(
    submissionSchema.safeParse({ kind: 'request', email: 'reader@example.test', product: ' ' })
      .success,
    false,
  );
  assert.equal(
    submissionSchema.safeParse({
      kind: 'newsletter',
      email: 'reader@example.test',
      website: 'spam',
    }).success,
    false,
  );
});

test('turquoise/dark text and focus colors meet normal text contrast', () => {
  function luminance(hex: string) {
    const v = hex
      .match(/.{2}/g)!
      .map((s) => parseInt(s, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function contrast(a: string, b: string) {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
  }
  assert.ok(contrast('06302E', '35E0DE') >= 4.5);
  assert.ok(contrast('4A505C', 'FCFAF7') >= 4.5);
  assert.ok(contrast('00706F', 'FCFAF7') >= 4.5);
});
