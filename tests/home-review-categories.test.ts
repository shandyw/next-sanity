import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homeReviewCategories } from '../lib/home-review-categories';
import type { DocumentContent } from '../lib/types';
import { schemaTypes } from '../sanity/schema';

function review(id: string, categories: DocumentContent['categories']): DocumentContent {
  return {
    _id: id,
    _type: 'review',
    title: id,
    slug: id,
    publishedAt: '2026-01-01T00:00:00Z',
    categories,
  };
}

test('only categories with published reviews appear, including a single category', () => {
  assert.deepEqual(homeReviewCategories([]), []);
  assert.deepEqual(
    homeReviewCategories([review('one', [{ _id: 'tops', title: 'Tops', slug: 'tops' }])]).map(
      (item) => item.title,
    ),
    ['Tops'],
  );
  assert.deepEqual(
    homeReviewCategories([review('drafts.one', [{ _id: 'tops', title: 'Tops' }])]),
    [],
  );
  assert.deepEqual(
    homeReviewCategories([
      { ...review('one', [{ _id: 'tops', title: 'Tops' }]), publishedAt: undefined },
    ]),
    [],
  );
});

test('counts each review once per category and keeps all populated categories', () => {
  const tops = { _id: 'tops', title: 'Tops', slug: 'tops' };
  const dresses = { _id: 'dresses', title: 'Dresses', slug: 'dresses' };
  const result = homeReviewCategories([
    review('one', [tops, tops, dresses]),
    review('two', [tops]),
  ]);
  assert.deepEqual(
    result.map(({ title, count }) => [title, count]),
    [
      ['Tops', 2],
      ['Dresses', 1],
    ],
  );
});

test('Clothing categories offer a homepage image and blurb in Studio', () => {
  const schema = schemaTypes.find((type) => type.name === 'clothingCategory');
  assert.ok(schema);
  assert.ok('fields' in schema);
  assert.ok(schema.fields.some((field) => field.name === 'homepageImage'));
  assert.ok(schema.fields.some((field) => field.name === 'homepageBlurb'));
});
