import test from 'node:test';
import assert from 'node:assert/strict';
import { Schema } from '@sanity/schema';
import { groupProblems, validateSchema } from '@sanity/schema/_internal';
import { schemaTypes } from '../sanity/schema';
import { amazonProductFields } from '../sanity/amazon-fields';

test('complete Studio schema validates and compiles without field conflicts', () => {
  const problems = groupProblems(validateSchema(schemaTypes).getTypes());
  const errors = problems.flatMap((group) =>
    group.problems.filter((problem) => problem.severity === 'error'),
  );
  assert.deepEqual(errors, []);
  const schema = Schema.compile({ name: 'curvygirlreviews', types: schemaTypes });
  const product = schema.get('product');
  assert.equal(
    product.fields.filter((field: { name: string }) => field.name === 'styleModel').length,
    1,
  );
});

test('Amazon product fields on closet items require an underlying Amazon product', () => {
  const product = schemaTypes.find((type) => type.name === 'product') as {
    fields: { name: string; hidden?: boolean | ((context: { document: Record<string, unknown> }) => boolean) }[];
  };
  const hidden = (name: string, document: Record<string, unknown>) => {
    const field = product.fields.find((item) => item.name === name);
    assert.ok(field, name);
    return typeof field.hidden === 'function' ? field.hidden({ document }) : field.hidden === true;
  };
  const closet = { catalogSource: 'closet', onReviewWishlist: true };
  const linked = { ...closet, underlyingProduct: { _ref: 'amazon-item' } };
  const amazon = { catalogSource: 'amazon', onReviewWishlist: true };
  for (const name of [
    ...amazonProductFields.map((field) => field.name).filter((name) => name !== 'indexingIntent'),
    'onReviewWishlist',
    'importedImageUrl',
    'priority',
    'requestedQuantity',
    'receivedQuantity',
    'referencePrice',
    'retailer',
    'affiliateLink',
    'personallyTried',
    'availableSizes',
    'priceMaintained',
  ]) {
    assert.equal(hidden(name, closet), true, `${name} should be hidden on an unlinked closet item`);
    assert.equal(hidden(name, linked), false, `${name} should show on a linked closet item`);
    assert.equal(hidden(name, amazon), false, `${name} should show on an Amazon item`);
  }
  for (const name of ['amazonAsin', 'indexingIntent']) {
    assert.equal(hidden(name, linked), true);
    assert.equal(hidden(name, amazon), true);
  }
});
