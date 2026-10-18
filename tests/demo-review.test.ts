import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exampleReview, localDemoReviews } from '../lib/demo-review';
test('example review is complete, clearly illustrative, and disabled in production', () => {
  assert.equal(exampleReview({ NODE_ENV: 'production', ENABLE_DEMO_CONTENT: 'true' }), undefined);
  assert.equal(exampleReview({ NODE_ENV: 'development', ENABLE_DEMO_CONTENT: 'false' }), undefined);
  const env = { NODE_ENV: 'development', ENABLE_DEMO_CONTENT: 'true' };
  const review = exampleReview(env)!;
  assert.equal(review.demo, true);
  assert.equal(Object.keys(review.reviewSections!).length, 4);
  assert.ok(review.reviewSections!.firstImpression!.copy!.length);
  assert.ok(review.shannequinQuote);
  assert.equal(review.photos!.length, 2);
  assert.equal(review.products, undefined);
  assert.deepEqual(localDemoReviews([], env), [review]);
  const real = { ...review, _id: 'real-review', demo: false };
  assert.deepEqual(localDemoReviews([real], env), [real]);
  assert.deepEqual(
    localDemoReviews([], { NODE_ENV: 'production', ENABLE_DEMO_CONTENT: 'true' }),
    [],
  );
});
