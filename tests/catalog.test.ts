import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse, evaluate } from 'groq-js';
import {
  catalogSource,
  catalogPlacements,
  closetStatus,
  reviewWishlistItems,
  acknowledgment,
  placementError,
} from '../lib/catalog';
import { catalogMigrationPlan } from '../lib/catalog-migration';
import { ownedImportFields } from '../lib/import-ownership';
import { publicProjection } from '../lib/public-projection';
import { sectionProducts } from '../lib/shopping';
import { ProductAction } from '../components/ProductAction';
import { assertNoProductReferences, saveCatalogDraft } from '../sanity/catalog/model';
import type { DocumentContent } from '../lib/types';
const product = (extra: Partial<DocumentContent> = {}): DocumentContent => ({
  _id: 'item',
  _type: 'product',
  title: 'Item',
  slug: 'item',
  ...extra,
});
test('legacy identities retain placements; explicit multiple placements require one Amazon record', () => {
  assert.equal(catalogSource({ shoppingSection: 'finds' }), 'amazon');
  assert.deepEqual(catalogPlacements({ onReviewWishlist: true, shoppingSection: 'finds' }), [
    'finds',
    'reviewWishlist',
  ]);
  assert.deepEqual(catalogPlacements({ catalogSource: 'amazon', displayPlacements: [] }), []);
  assert.ok(placementError({ catalogSource: 'closet', displayPlacements: ['finds'] }));
  const d = product({ catalogSource: 'amazon', displayPlacements: ['finds', 'reviewWishlist'] });
  assert.equal(sectionProducts([d], 'finds')[0]._id, reviewWishlistItems([d])[0]._id);
  assert.equal(reviewWishlistItems([{ ...d, reviewProgress: 'received' }]).length, 0);
});
test('sold/archived items leave grids, retain identity and have no purchase actions', () => {
  const sold = product({
    availability: 'sold',
    saleStatus: 'available',
    vintedUrl: 'https://www.vinted.com/items/123-item',
  });
  assert.equal(closetStatus(sold), 'sold');
  assert.equal(sectionProducts([sold], 'closet').length, 0);
  assert.equal(sectionProducts([product({ archived: true })], 'closet').length, 0);
  for (const d of [sold, product({ archived: true, availability: 'available' })])
    assert.doesNotMatch(renderToStaticMarkup(createElement(ProductAction, { product: d })), /<a /);
});
test('physical closet unit links to Vinted', () => {
  const html = renderToStaticMarkup(
    createElement(ProductAction, {
      product: product({
        availability: 'available',
        vintedUrl: 'https://www.vinted.com/items/123-item',
      }),
    }),
  );
  assert.match(html, /Shop on Vinted/);
});
test('repeat source-fact imports preserve editorial work, placements, IDs and explicit overrides', () => {
  const original = {
    _id: 'one',
    title: 'Edited title',
    description: 'Authored',
    photos: [{ asset: { _ref: 'custom' }, alt: 'Own alt' }],
    displayPlacements: ['finds'],
    archived: true,
    reviewProgress: 'received',
    brand: { _ref: 'my-brand' },
    importOverrides: ['brand', 'saleStatus'],
    importedFacts: { title: 'Imported title' },
  };
  const patch = ownedImportFields(
    {
      title: 'CSV title',
      description: 'CSV text',
      brand: { _ref: 'csv-brand' },
      saleStatus: 'available',
      availability: 'available',
      size: '18',
      photos: [{ asset: { _ref: 'imported' }, alt: 'New' }],
      displayPlacements: ['closet'],
      reviewProgress: 'wanted',
    },
    original,
  );
  assert.equal(patch.title, undefined);
  assert.equal(patch.description, undefined);
  assert.equal(patch.brand, undefined);
  assert.equal(patch.availability, undefined);
  assert.equal(patch.saleStatus, undefined);
  assert.equal(patch.displayPlacements, undefined);
  assert.equal(patch.reviewProgress, undefined);
  assert.equal(patch.size, '18');
  assert.deepEqual((patch.photos as unknown[])[0], original.photos[0]);
  assert.equal(original._id, 'one');
  assert.equal(
    ownedImportFields(
      { title: 'Next name' },
      { title: 'CSV name', importedFacts: { title: 'CSV name' } },
    ).title,
    'Next name',
  );
});
test('actual GROQ projection excludes admin fields and unapproved images, including nested products', async () => {
  const amazon = {
    _id: 'amazon',
    _type: 'product',
    title: 'Amazon item',
    slug: { current: 'amazon' },
    shoppingSection: 'finds',
    amazonAsin: 'B0C5R6Q2XZ',
    listingPrice: 777,
    referencePrice: 'ADMIN PRICE',
    importedImageUrl: 'https://m.media-amazon.com/SECRET.jpg',
    sourceSnapshot: { price: 'ADMIN SNAPSHOT' },
    importOverrides: ['title'],
    photos: [
      { asset: { _ref: 'reference' }, alt: 'Reference', sourceKind: 'amazon' },
      { asset: { _ref: 'original' }, alt: 'Original', sourceKind: 'original' },
    ],
  };
  const review = {
    _id: 'review',
    _type: 'review',
    title: 'Review',
    slug: { current: 'review' },
    readerProvided: true,
    senderNamePermission: false,
    senderDisplayName: 'HIDDEN NAME',
    thankYouMessage: 'HIDDEN THANKS',
    reviewedProducts: [{ _type: 'reference', _ref: 'amazon' }],
    ctaProduct: { _type: 'reference', _ref: 'amazon' },
  };
  const result = await (
    await evaluate(parse(`*[]${publicProjection}`), { dataset: [amazon, review] })
  ).get();
  const json = JSON.stringify(result);
  for (const secret of [
    'ADMIN PRICE',
    'ADMIN SNAPSHOT',
    'SECRET.jpg',
    'HIDDEN NAME',
    'HIDDEN THANKS',
    '777',
    '"reference"',
  ])
    assert.ok(!json.includes(secret), secret);
  assert.match(json, /original/);
  assert.match(json, /reviewedProducts/);
  const publicAmazon = result.find((d: { _id: string }) => d._id === 'amazon');
  assert.equal(publicAmazon.photos.length, 1);
  assert.equal(publicAmazon.photos[0].alt, 'Original');
});
test('acknowledgments cannot render custom text or a name without permission', () => {
  const d = {
    readerProvided: true,
    senderDisplayName: 'Private Name',
    thankYouMessage: 'Thanks Private Name',
    senderNamePermission: false,
  };
  assert.doesNotMatch(acknowledgment(d)!, /Private Name/);
  assert.equal(acknowledgment({ ...d, readerProvided: false }), undefined);
  assert.equal(acknowledgment({ ...d, senderNamePermission: true }), 'Thanks Private Name');
});
test('migration is additive, reversible and leaves sold status, IDs, references and edited placements alone', () => {
  const docs = [
    {
      _id: 'drafts.item',
      _rev: 'r',
      _type: 'product',
      availability: 'sold',
      sku: '0001',
      relatedReview: { _ref: 'r' },
    },
    {
      _id: 'amazon',
      _rev: 'r2',
      _type: 'product',
      shoppingSection: 'finds',
      onReviewWishlist: true,
      displayPlacements: ['finds'] as ['finds'],
    },
  ];
  const before = JSON.stringify(docs),
    plan = catalogMigrationPlan(docs);
  assert.equal(JSON.stringify(docs), before);
  assert.equal(plan[0].setIfMissing.saleStatus, undefined);
  assert.equal(plan[0].id, 'drafts.item');
  assert.equal(plan[1].setIfMissing.displayPlacements, undefined);
  assert.deepEqual(plan[0].rollbackUnset, Object.keys(plan[0].setIfMissing));
});
test('permanent deletion rejects referencing reviews and collections', async () => {
  const client = {
    fetch: async () => [{ _id: 'review', title: 'Jeans review' }],
  } as unknown as Parameters<typeof assertNoProductReferences>[0];
  await assert.rejects(
    () => assertNoProductReferences(client, 'drafts.item'),
    /Archive instead.*Jeans review/,
  );
});
test('archive patches only the current draft; stale edits are rejected', async () => {
  let fields: unknown;
  const draft = { _id: 'drafts.item', _rev: 'current', _type: 'product', description: 'Keep' };
  const client = {
    fetch: async () => [draft],
    patch: () => {
      const p = {
        ifRevisionId: (rev: string) => {
          assert.equal(rev, 'current');
          return p;
        },
        set: (value: unknown) => {
          fields = value;
          return p;
        },
        commit: async () => {},
      };
      return p;
    },
  } as unknown as Parameters<typeof saveCatalogDraft>[0];
  await saveCatalogDraft(client, draft, { archived: true });
  assert.deepEqual(fields, { archived: true });
  assert.equal(draft.description, 'Keep');
  await assert.rejects(
    () => saveCatalogDraft(client, { ...draft, _rev: 'old' }, { archived: false }),
    /Item changed/,
  );
});

test('unset projected placements are null and use legacy fallbacks; empty placements remain deliberate', () => {
  assert.deepEqual(
    catalogPlacements({
      shoppingSection: 'finds',
      onReviewWishlist: true,
      displayPlacements: null,
    }),
    ['finds', 'reviewWishlist'],
  );
  assert.deepEqual(catalogPlacements({ displayPlacements: null }), ['closet']);
  assert.deepEqual(catalogPlacements({ displayPlacements: [] }), []);
  assert.equal(
    reviewWishlistItems([
      product({ displayPlacements: null } as unknown as Partial<DocumentContent>),
    ]).length,
    0,
  );
});
