import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { browse, archiveUrl } from '../lib/browse';
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
  assert.equal(browse(collection, { min_price: '10', max_price: '12' }).count, collection.length);
  assert.equal(
    archiveUrl('/shop', { min_price: '10', max_price: '12', category: 'shoes' }),
    '/shop?category=shoes',
  );
});
test('removed Format filter no longer changes review results or archive links', () => {
  assert.equal(browse(collection, { format: 'video' }).count, collection.length);
  assert.equal(
    archiveUrl('/reviews', { format: 'video', category: 'jeans' }),
    '/reviews?category=jeans',
  );
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

test('implemented editorial tokens meet text and control contrast requirements', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  const token = (name: string, seen = new Set<string>()): string => {
    assert.ok(!seen.has(name), `Circular semantic token: ${name}`);
    seen.add(name);
    const value = css.match(
      new RegExp(`--color-${name}:\\s*(?:#([0-9a-f]{6})|var\\(\\s*--color-([a-z-]+)\\s*\\));`, 'i'),
    );
    assert.ok(value, `Missing semantic token: ${name}`);
    return value[1] || token(value[2], seen);
  };
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
  assert.ok(contrast(token('primary-ink'), token('brand-pink')) >= 4.5);
  assert.ok(contrast(token('primary-button-ink'), token('primary')) >= 4.5);
  assert.ok(contrast(token('secondary-ink'), token('secondary-action')) >= 4.5);
  assert.ok(contrast(token('ink-soft'), token('page-background')) >= 4.5);
  assert.ok(contrast(token('ink-soft'), token('surface')) >= 4.5);
  assert.ok(contrast(token('link'), token('page-background')) >= 4.5);
  assert.ok(contrast(token('border-control'), token('page-background')) >= 3);
  assert.ok(contrast(token('success'), 'FFFFFF') >= 3);
  assert.ok(contrast(token('error-text'), 'FFFFFF') >= 4.5);
});
