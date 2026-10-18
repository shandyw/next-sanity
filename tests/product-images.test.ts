import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_IMAGE, productImageResolutionWarning } from '../lib/product-images';

test('portrait source and effective saved crop meet the minimum resolution', () => {
  assert.equal(PRODUCT_IMAGE.width / PRODUCT_IMAGE.height, 4 / 5);
  assert.equal(
    productImageResolutionWarning({ asset: { _ref: 'image-fixture-1080x1350-jpg' } }),
    true,
  );
  assert.equal(
    productImageResolutionWarning({ asset: { _ref: 'image-fixture-800x1000-png' } }),
    true,
  );
  assert.equal(
    productImageResolutionWarning({ asset: { _ref: 'image-fixture-2000x1000-jpg' } }),
    true,
  );
  assert.match(
    String(productImageResolutionWarning({ asset: { _ref: 'image-fixture-799x1000-jpg' } })),
    /below 800/,
  );
  assert.match(
    String(
      productImageResolutionWarning({
        asset: { _ref: 'image-fixture-1080x1350-png' },
        crop: { left: 0.2, right: 0.2, top: 0, bottom: 0 },
      }),
    ),
    /below 800/,
  );
  assert.equal(productImageResolutionWarning(undefined), true);
});
