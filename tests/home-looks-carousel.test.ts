import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carouselPosition } from '../components/HomeLooksCarousel';

test('carousel controls appear only when Looks exceed visible capacity', () => {
  for (const visible of [1, 2, 3]) {
    const width = visible * 300 + (visible - 1) * 24;
    for (const count of [0, 1, 2, 3, 4, 5]) {
      const position = carouselPosition(count, width, 300, 24, 0);
      assert.equal(position.last, Math.max(0, count - visible));
      assert.equal(position.index, 0);
    }
  }
});

test('carousel position advances one Look and clamps at both boundaries', () => {
  assert.deepEqual(carouselPosition(5, 948, 300, 24, 324), { index: 1, last: 2 });
  assert.deepEqual(carouselPosition(5, 948, 300, 24, 5000), { index: 2, last: 2 });
  assert.deepEqual(carouselPosition(5, 948, 300, 24, -100), { index: 0, last: 2 });
});
