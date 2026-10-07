import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWishlist, wishlistLimit } from '../lib/wishlist';

test('wishlist storage handles corrupt data, unknown versions, duplicates, and limits', () => {
  for (const value of [
    null,
    'bad json',
    'null',
    '[]',
    '{"version":2,"ids":["a"]}',
    '{"version":1,"ids":{}}',
  ])
    assert.deepEqual(parseWishlist(value), []);
  assert.deepEqual(
    parseWishlist(
      JSON.stringify({ version: 1, ids: ['a', 'a', '', 42, null, 'b', 'x'.repeat(257)] }),
    ),
    ['a', 'b'],
  );
  assert.equal(
    parseWishlist(
      JSON.stringify({ version: 1, ids: Array.from({ length: 500 }, (_, i) => String(i)) }),
    ).length,
    wishlistLimit,
  );
});
