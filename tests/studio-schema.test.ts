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

test('listing and Vinted currencies default to USD without editor controls', () => {
  const product = schemaTypes.find((type) => type.name === 'product') as {
    fields: {
      name: string;
      hidden?: boolean;
      initialValue?: string;
      fields?: { name: string; hidden?: boolean; initialValue?: string }[];
    }[];
  };
  const listingCurrency = product.fields.find((field) => field.name === 'currency');
  const vintedCurrency = product.fields
    .find((field) => field.name === 'vintedPrice')
    ?.fields?.find((field) => field.name === 'currency');
  for (const field of [listingCurrency, vintedCurrency]) {
    assert.equal(field?.hidden, true);
    assert.equal(field?.initialValue, 'USD');
  }
});

test('read-only product fields are hidden in the editor', () => {
  type Field = {
    name: string;
    readOnly?: boolean | ((context: { document: Record<string, unknown> }) => boolean);
    hidden?: boolean | ((context: { document: Record<string, unknown> }) => boolean);
    fields?: Field[];
    of?: Field[];
  };
  const product = schemaTypes.find((type) => type.name === 'product') as { fields: Field[] };
  const byName = (fields: Field[], name: string) => {
    const field = fields.find((item) => item.name === name);
    assert.ok(field, name);
    return field;
  };
  for (const name of ['importedFacts', 'amazonAsin', 'masterInventorySku', 'vintedPrice']) {
    const field = byName(product.fields, name);
    assert.equal(field.readOnly, true, `${name} should remain protected`);
    assert.equal(field.hidden, true, `${name} should be hidden`);
  }
  assert.equal(
    product.fields.some((field) => field.name === 'lastImportedAt'),
    false,
  );
  const filenames = byName(byName(product.fields, 'photos').of![0].fields!, 'sourceFilenames');
  assert.equal(filenames.readOnly, true);
  assert.equal(filenames.hidden, true);

  const availability = byName(product.fields, 'availability');
  for (const [saleStatus, expected] of [
    [undefined, false],
    ['available', true],
    ['sold', true],
  ] as const) {
    const context = { document: { saleStatus } };
    assert.equal(
      typeof availability.readOnly === 'function' && availability.readOnly(context),
      expected,
    );
    assert.equal(
      typeof availability.hidden === 'function' && availability.hidden(context),
      expected,
    );
  }
});

test('Curated Finds have a two-choice review status with Not reviewed as the default', () => {
  type Field = {
    name: string;
    initialValue?: string;
    hidden?: (context: { document: Record<string, unknown> }) => boolean;
    options?: { list?: { title: string; value: string }[] };
  };
  const product = schemaTypes.find((type) => type.name === 'product') as { fields: Field[] };
  const curated = product.fields.find((field) => field.name === 'curatedReviewStatus');
  const progress = product.fields.find((field) => field.name === 'reviewProgress');
  assert.equal(curated?.initialValue, 'not_reviewed');
  assert.deepEqual(curated?.options?.list, [
    { title: 'Not reviewed', value: 'not_reviewed' },
    { title: 'Reviewed', value: 'reviewed' },
  ]);
  const find = { catalogSource: 'amazon', displayPlacements: ['finds'] };
  assert.equal(curated?.hidden?.({ document: find }), false);
  assert.equal(progress?.hidden?.({ document: find }), true);
  assert.equal(curated?.hidden?.({ document: { catalogSource: 'closet' } }), true);
  const wishlistOnly = { catalogSource: 'amazon', displayPlacements: ['reviewWishlist'] };
  assert.equal(curated?.hidden?.({ document: wishlistOnly }), true);
  assert.equal(progress?.hidden?.({ document: wishlistOnly }), false);
});

test('Amazon product fields on closet items require an underlying Amazon product', () => {
  const product = schemaTypes.find((type) => type.name === 'product') as {
    fields: {
      name: string;
      hidden?: boolean | ((context: { document: Record<string, unknown> }) => boolean);
    }[];
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
