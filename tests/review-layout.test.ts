import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewPhotos, reviewSections } from '../lib/review-layout';
import type { DocumentContent } from '../lib/types';
test('review media retains the featured image and gallery order without duplicating an asset', () => {
  const featured = { asset: { _ref: 'image-a' }, alt: 'Front view' };
  const detail = { asset: { _ref: 'image-b' }, alt: 'Pocket detail' };
  const review: DocumentContent = {
    _id: 'review',
    _type: 'review',
    title: 'Jeans',
    slug: 'jeans',
    featuredImage: featured,
    photos: [featured, detail],
  };
  assert.deepEqual(reviewPhotos(review), [featured, detail]);
  assert.deepEqual(reviewPhotos({ ...review, featuredImage: undefined, photos: undefined }), []);
  assert.deepEqual(
    reviewSections.map((section) => section.heading),
    ['First Impression', 'Fit / Comfort', 'Who might like this?', 'Final Take'],
  );
});

test('review schema provides editable defaults and preserves legacy publishing validation', async () => {
  const { schemaTypes } = await import('../sanity/schema');
  const review = schemaTypes.find((type) => type.name === 'review');
  if (!review || !('fields' in review) || !('validation' in review))
    throw Error('Review schema is missing fields or validation.');
  const sections = review.fields!.find((field) => field.name === 'reviewSections') as unknown as {
    initialValue: Record<string, { heading: string }>;
    fields: { name: string; fields: { name: string }[] }[];
  };
  assert.equal(sections.initialValue.firstImpression.heading, 'First Impression');
  assert.equal(sections.fields.length, 4);
  assert.deepEqual(
    sections.fields[0].fields.map((field) => field.name),
    ['heading', 'copy'],
  );
  let validate: (doc: Record<string, unknown>) => string | boolean = () => false;
  (
    review.validation as unknown as (rule: {
      custom: (callback: typeof validate) => object;
    }) => unknown
  )({
    custom(callback) {
      validate = callback;
      return {};
    },
  });
  assert.equal(validate({ body: [{ _type: 'block' }] }), true);
  assert.equal(typeof validate({ reviewSections: { firstImpression: { copy: [{}] } } }), 'string');
  const complete = Object.fromEntries(
    reviewSections.map(({ key }) => [key, { heading: 'Custom heading', copy: [{}] }]),
  );
  assert.equal(validate({ reviewSections: complete }), true);
  assert.equal(typeof validate({ reviewSections: complete, format: 'video' }), 'string');
  assert.equal(
    validate({
      reviewSections: complete,
      format: 'both',
      videoUrl: 'https://example.test/try-on.mp4',
    }),
    true,
  );
});
