import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMasterInventory, imageNames, type MasterRecord } from '../lib/master-inventory';
import { applyMasterRow, previewMaster, type MasterRow } from '../sanity/imports/master-model';
import type { ImportTarget } from '../sanity/imports/targets';
import type { useClient } from 'sanity';

const headers = 'SKU,STATUS,NAME,DESCRIPTION,BRAND,SIZE,IMAGES,VINTED\n';
const record: MasterRecord = {
  sku: 'SH-001',
  status: 'available',
  title: 'Master boots',
  description: 'Master description',
  brand: '',
  size: '',
  images: [],
  vinted: 49,
};
const existing = (extra: Partial<ImportTarget> = {}): ImportTarget => ({
  _id: 'owned',
  _rev: 'r1',
  _type: 'product',
  shoppingSection: 'closet',
  sku: 'SH-001',
  title: 'Old boots',
  ...extra,
});
function mock(initial: ImportTarget[] = []) {
  const docs = structuredClone(initial);
  const uploads: string[] = [];
  const client = {
    withConfig: () => client,
    fetch: async (query: string, params: Record<string, unknown>) =>
      structuredClone(
        query.includes("_type=='sanity.imageAsset'")
          ? docs
              .filter(
                (doc) =>
                  doc._type === 'sanity.imageAsset' &&
                  doc._id > String(params.cursor) &&
                  ((params.filenames as string[]).includes(String(doc.originalFilename)) ||
                    (params.assetIds as string[]).includes(doc._id)),
              )
              .sort((a, b) => a._id.localeCompare(b._id))
              .slice(0, 500)
          : params.cursor !== undefined
            ? docs
                .filter(
                  (doc) =>
                    doc._type ===
                      (query.includes("_type=='brand'")
                        ? 'brand'
                        : query.includes("_type=='clothingCategory'")
                          ? 'clothingCategory'
                          : 'product') && doc._id > (params.cursor as string),
                )
                .sort((a, b) => a._id.localeCompare(b._id))
                .slice(0, 500)
            : docs.filter(
                (doc) =>
                  doc._type === 'product' &&
                  ((doc.sku || '').toLowerCase() === params.sku ||
                    String(doc.masterInventorySku || '').toLowerCase() === params.sku ||
                    (params.ids as string[]).includes(doc._id)),
              ),
      ),
    getDocuments: async (ids: string[]) =>
      structuredClone(ids.map((id) => docs.find((doc) => doc._id === id) || null)),
    create: async (doc: ImportTarget) => {
      if (docs.some((item) => item._id === doc._id)) throw Error('duplicate');
      docs.push({ ...doc, _rev: 'created' });
    },
    createIfNotExists: async (doc: ImportTarget) => {
      if (!docs.some((item) => item._id === doc._id)) docs.push({ ...doc, _rev: 'created' });
      return doc;
    },
    patch: (id: string) => {
      let rev = '',
        fields = {};
      let unsetFields: string[] = [];
      const patch = {
        unset: (keys: string[]) => {
          unsetFields = keys;
          return patch;
        },
        ifRevisionId: (value: string) => {
          rev = value;
          return patch;
        },
        set: (value: object) => {
          fields = value;
          return patch;
        },
        commit: async () => {
          const doc = docs.find((item) => item._id === id)!;
          assert.equal(doc._rev, rev);
          Object.assign(doc, fields, { _rev: 'updated' });
          for (const key of unsetFields) delete doc[key];
        },
      };
      return patch;
    },
    transaction: () => {
      let guardId = '',
        guardRev = '';
      let created: ImportTarget;
      const tx = {
        patch: (id: string, callback: (p: unknown) => unknown) => {
          guardId = id;
          const patch = {
            ifRevisionId: (rev: string) => {
              guardRev = rev;
              return patch;
            },
            set: () => patch,
          };
          callback(patch);
          return tx;
        },
        create: (doc: ImportTarget) => {
          created = doc;
          return tx;
        },
        commit: async () => {
          assert.equal(docs.find((doc) => doc._id === guardId)?._rev, guardRev);
          await client.create(created);
        },
      };
      return tx;
    },
    assets: {
      upload: async (_type: string, file: globalThis.File) => {
        uploads.push(file.name);
        return {
          _id: 'image-' + (file.name.startsWith('front') ? 'a' : 'b').repeat(40) + '-1080x1350-jpg',
        };
      },
    },
  };
  return { client: client as unknown as ReturnType<typeof useClient>, docs, uploads };
}
const row = (extra: Partial<MasterRow> = {}): MasterRow => ({
  record,
  choice: 'create',
  candidates: [],
  note: '',
  ...extra,
});
test('master columns parse multiline descriptions, prices and literal SKU zeros', () => {
  const result = parseMasterInventory(
    headers +
      'SH-001,Available,Boots,"First line\nSecond line",Ryka,9,front.jpg | back.jpg,$49\n',
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.records[0].sku, 'SH-001');
  assert.equal(result.records[0].description, 'First line\nSecond line');
  assert.deepEqual(result.records[0].images, ['front.jpg', 'back.jpg']);
  assert.equal(parseMasterInventory(headers + '00001,Sold,Item,,,,,0\n').records[0].sku, '00001');
  assert.equal(
    parseMasterInventory(headers + '00001,Sold,Item,,,,,0\n').records[0].status,
    'sold',
  );
});
test('master import rejects duplicate SKUs, ambiguous statuses, malformed prices and remote image fetching', () => {
  assert.match(
    parseMasterInventory(
      headers + 'SH-001,Available,Boots,,,,,\nsh-001,Sold,Boots,,,,,\n',
    ).errors.join(),
    /appears more than once/,
  );
  assert.ok(parseMasterInventory(headers + 'SH-001,,Boots,,,,,\n').errors.length);
  assert.match(
    parseMasterInventory(
      headers + 'SH-001,Available,Boots,,,,,https://example.com/item\n',
    ).errors.join(),
    /must contain a price/,
  );
  assert.throws(() => imageNames('https://example.com/a.jpg'), /filenames/);
  assert.throws(() => imageNames('../a.jpg'), /filenames/);
  assert.throws(() => parseMasterInventory('SKU,NAME\na,b'), /master columns/);
});
test('one SKU creates one Vinted draft and unchanged reruns skip', async () => {
  const { client, docs } = mock();
  assert.equal(await applyMasterRow(client, row(), 'USD', new Map(), []), 'created');
  assert.equal(docs.length, 1);
  assert.ok(docs[0]._id.startsWith('drafts.master-inventory-'));
  assert.equal(docs[0].sku, 'SH-001');
  assert.equal(docs[0].masterInventorySku, 'SH-001');
  assert.deepEqual(docs[0].vintedPrice, { amount: 49, currency: 'USD' });
  assert.equal(docs[0].listingPrice, 49);
  assert.equal(docs[0].lastSuccessfullyCheckedAt, undefined);
  const rerun = previewMaster([record], structuredClone(docs))[0];
  assert.equal(await applyMasterRow(client, rerun, 'USD', new Map(), []), 'skipped');
  assert.equal(docs.length, 1);
  await assert.rejects(() => applyMasterRow(client, row(), 'USD', new Map(), []), /already exists/);
});
test('master updates selected fields in drafts while preserving blank fields, URLs, photos and reviews', async () => {
  const original = existing({
    size: '9M',
    description: 'Existing description',
    photos: [{ asset: { _ref: 'owned-photo' }, crop: { top: 0.1 }, alt: 'Owned' }],
    vintedUrl: 'https://vinted.com/items/123',
    purchaseUrl: 'https://vinted.com/items/123',
    relatedReview: { _ref: 'review1' },
    slug: { current: 'existing-url' },
    brand: { _ref: 'brand1' },
    vintedPrice: { amount: 40, currency: 'USD' },
  });
  const { client, docs } = mock([original]);
  const changed = { ...record, status: 'sold' as const, description: '', vinted: undefined };
  await applyMasterRow(
    client,
    row({ record: changed, choice: 'update', target: original }),
    'USD',
    new Map(),
    [],
  );
  assert.deepEqual(docs[0], original);
  const draft = docs[1];
  assert.equal(draft.saleStatus, 'sold');
  assert.equal(draft.availability, 'sold');
  assert.equal(draft.description, original.description);
  assert.deepEqual(draft.photos, original.photos);
  assert.deepEqual(draft.relatedReview, original.relatedReview);
  assert.deepEqual(draft.slug, original.slug);
  assert.deepEqual(draft.brand, original.brand);
  assert.equal(draft.size, '9M');
  assert.equal(draft.purchaseUrl, original.purchaseUrl);
  assert.deepEqual(draft.vintedPrice, original.vintedPrice);
});
test('legacy matches require review; duplicate SKU and excluded or disabled items cannot overwrite', async () => {
  const legacy = existing({ sku: 'CGR-001', externalListingId: 'SH-001' });
  assert.equal(previewMaster([record], [legacy])[0].choice, 'skip');
  assert.equal(previewMaster([record], [legacy])[0].candidates.length, 1);
  const { client, docs } = mock([legacy]);
  await applyMasterRow(client, row({ choice: 'match', target: legacy }), 'USD', new Map(), []);
  assert.equal(docs[1].sku, 'SH-001');
  assert.equal(docs[1]._id, 'drafts.owned');
  assert.equal(previewMaster([record], [existing(), existing({ _id: 'other' })])[0].choice, 'skip');
  for (const extra of [
    { shoppingSection: 'finds' },
    { affiliateLink: true },
    { importEnabled: false },
  ]) {
    const original = existing(extra);
    const denied = mock([original]);
    await assert.rejects(
      () =>
        applyMasterRow(
          denied.client,
          row({ choice: 'update', target: original }),
          'USD',
          new Map(),
          [],
        ),
      /not eligible/,
    );
    assert.equal(denied.docs.length, 1);
  }
});
test('image filenames upload in order, preserve retained crop/alt, and missing files fail before mutations', async () => {
  const filenameRecord = { ...record, images: ['front.jpg', 'back.jpg'] };
  const files = new Map<string, globalThis.File>([
    ['front.jpg', new File(['front'], 'front.jpg', { type: 'image/jpeg' })],
    ['back.jpg', new File(['back'], 'back.jpg', { type: 'image/jpeg' })],
  ]);
  const { client, docs, uploads } = mock();
  await assert.rejects(
    () => applyMasterRow(client, row({ record: filenameRecord }), 'USD', new Map(), []),
    /Select the photo/,
  );
  assert.equal(docs.length, 0);
  await applyMasterRow(client, row({ record: filenameRecord }), 'USD', files, []);
  assert.deepEqual(uploads, ['front.jpg', 'back.jpg']);
  const photos = docs[0].photos as { asset: { _ref: string }; alt: string }[];
  assert.equal(photos.length, 2);
  assert.ok(photos[0].asset._ref.startsWith('image-aaaa'));
  assert.deepEqual(
    photos.map((photo) => photo.alt),
    ['Master boots', 'Master boots'],
  );
});
test('brand references reuse existing labels or create a stable new brand without touching reviews', async () => {
  const existingBrand = existing({ _id: 'brand-existing', _type: 'brand', title: 'Ryka' });
  const { client, docs } = mock([existingBrand]);
  await applyMasterRow(client, row({ record: { ...record, brand: 'ryka' } }), 'USD', new Map(), [
    existingBrand,
  ]);
  assert.deepEqual(docs[1].brand, { _type: 'reference', _ref: 'brand-existing' });
  const next = mock();
  await applyMasterRow(
    next.client,
    row({ record: { ...record, brand: 'Ryka' } }),
    'USD',
    new Map(),
    [],
  );
  assert.equal(next.docs.filter((doc) => doc._type === 'brand').length, 1);
  assert.ok(
    String(
      (next.docs.find((doc) => doc._type === 'product')!.brand as { _ref: string })._ref,
    ).startsWith('master-brand-'),
  );
});

test('legacy items use the Vinted price', async () => {
  const original = existing();
  const { client, docs } = mock([original]);
  await applyMasterRow(client, row({ choice: 'update', target: original }), 'USD', new Map(), []);
  assert.equal(docs[1].listingPrice, 49);
});

test('master URL accepts only Vinted item links and strips tracking', () => {
  const csv = (url: string) =>
    headers.trimEnd() + ',URL\n' +
    ['SH-001', 'Available', 'Boots', '', '', '', '', '$49', url].join(',') + '\n';
  const parsed = parseMasterInventory(csv('https://www.vinted.com/items/123-boots?tracking=1#photo'));
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.records[0].url, 'https://www.vinted.com/items/123-boots');
  for (const invalid of [
    'https://www.vinted.com/member/123',
    'https://example.com/items/123',
    'http://www.vinted.com/items/123',
  ])
    assert.match(parseMasterInventory(csv(invalid)).errors.join(), /HTTPS Vinted item URL/);
});

test('photo reruns retain saved crop and alt text; concurrent edits reject the item save', async () => {
  const id = 'image-' + 'a'.repeat(40) + '-1080x1350-jpg';
  const original = existing({
    photos: [
      {
        _key: 'keep',
        _type: 'image',
        asset: { _type: 'reference', _ref: id },
        alt: 'Specific photo description',
        crop: { top: 0.1, bottom: 0, left: 0, right: 0 },
      },
    ],
  });
  const { client, docs } = mock([original]);
  const files = new Map([['front.jpg', new File(['front'], 'front.jpg', { type: 'image/jpeg' })]]);
  await applyMasterRow(
    client,
    row({ record: { ...record, images: ['front.jpg'] }, choice: 'update', target: original }),
    'USD',
    files,
    [],
  );
  const { sourceFilenames, ...savedPhoto } = (
    docs[1].photos as { sourceFilenames?: string[] }[]
  )[0];
  assert.deepEqual(sourceFilenames, ['front.jpg']);
  assert.deepEqual(savedPhoto, original.photos![0]);
  await assert.rejects(
    () => applyMasterRow(client, row({ choice: 'update', target: original }), 'USD', new Map(), []),
    /changed after preview/,
  );
});

test('previously uploaded filenames are reused without supplying or uploading files again', async () => {
  const asset = existing({
    _id: 'image-' + 'a'.repeat(40) + '-1080x1350-jpg',
    _type: 'sanity.imageAsset',
    originalFilename: 'front.jpg',
  });
  const original = existing({
    photos: [
      {
        _key: 'retained',
        _type: 'image',
        asset: { _type: 'reference', _ref: asset._id },
        alt: 'Edited description',
        crop: { top: 0.1 },
      },
    ],
  });
  const { client, docs, uploads } = mock([original, asset]);
  await applyMasterRow(
    client,
    row({ record: { ...record, images: ['front.jpg'] }, choice: 'update', target: original }),
    'USD',
    new Map(),
    [],
  );
  assert.deepEqual(uploads, []);
  const photo = (
    docs.find((doc) => doc._id === 'drafts.owned')!.photos as {
      alt: string;
      crop: unknown;
      sourceFilenames: string[];
    }[]
  )[0];
  assert.equal(photo.alt, 'Edited description');
  assert.deepEqual(photo.crop, { top: 0.1 });
  assert.deepEqual(photo.sourceFilenames, ['front.jpg']);
  const rerun = previewMaster(
    [{ ...record, images: ['front.jpg'] }],
    structuredClone(docs.filter((doc) => doc._id === 'drafts.owned')),
  )[0];
  assert.equal(await applyMasterRow(client, rerun, 'USD', new Map(), []), 'skipped');
  assert.deepEqual(uploads, []);
});
test('remembered filename aliases survive Sanity content deduplication and duplicate filenames require explicit resolution', async () => {
  const asset = existing({
    _id: 'image-' + 'a'.repeat(40) + '-1080x1350-jpg',
    _type: 'sanity.imageAsset',
    originalFilename: 'original-name.jpg',
  });
  const original = existing({
    photos: [
      {
        _key: 'kept',
        _type: 'image',
        asset: { _type: 'reference', _ref: asset._id },
        alt: 'Edited',
        sourceFilenames: ['front.jpg'],
      },
    ],
  });
  const { client, docs, uploads } = mock([original, asset]);
  await applyMasterRow(
    client,
    row({ record: { ...record, images: ['front.jpg'] }, choice: 'update', target: original }),
    'USD',
    new Map(),
    [],
  );
  assert.deepEqual(uploads, []);
  assert.equal(
    (docs.find((doc) => doc._id === 'drafts.owned')!.photos as { asset: { _ref: string } }[])[0]
      .asset._ref,
    asset._id,
  );
  const ambiguous = mock([asset, { ...asset, _id: 'image-' + 'b'.repeat(40) + '-1080x1350-jpg' }]);
  await assert.rejects(
    () =>
      applyMasterRow(
        ambiguous.client,
        row({ record: { ...record, images: ['original-name.jpg'] } }),
        'USD',
        new Map(),
        [],
      ),
    /Multiple uploaded images/,
  );
  assert.deepEqual(ambiguous.uploads, []);
});

test('existing image lookup paginates all matching assets and prefers the item gallery over filename collisions', async () => {
  const { fetchMasterImages, resolveMasterImage } = await import('../sanity/imports/master-images');
  const assets = Array.from({ length: 520 }, (_, index) => ({
    _id: `image-${String(index).padStart(4, '0')}`,
    originalFilename: 'front.jpg',
  }));
  const stub = {
    withConfig: () => stub,
    fetch: async (_query: string, params: { cursor: string }) =>
      assets.filter((asset) => asset._id > params.cursor).slice(0, 500),
  };
  const found = await fetchMasterImages(
    stub as unknown as ReturnType<typeof useClient>,
    ['front.jpg'],
    [],
  );
  assert.equal(found.length, 520);
  assert.equal(resolveMasterImage('front.jpg', undefined, found).ambiguous, true);
  const item = existing({ photos: [{ asset: { _ref: assets[519]._id }, alt: 'Kept' }] });
  assert.equal(resolveMasterImage('front.jpg', item, found).asset?._id, assets[519]._id);
});

test('master CSV imports category, brand and condition and reuses labels on reruns', async () => {
  const parsed = parseMasterInventory(
    'SKU,STATUS,NAME,DESCRIPTION,BRAND,SIZE,IMAGES,VINTED,Category,Condition\nSH-001,Available,Boots,,New Brand,,,,Shoes,Like new\n',
  );
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.records[0].category, 'Shoes');
  assert.equal(parsed.records[0].condition, 'Like new');
  const { client, docs } = mock();
  const imported = parsed.records[0];
  await applyMasterRow(client, row({ record: imported }), 'USD', new Map(), []);
  const product = docs.find((doc) => doc._type === 'product')!;
  const category = docs.find((doc) => doc._type === 'clothingCategory')!;
  assert.equal(category.title, 'Shoes');
  assert.equal(product.condition, 'Like new');
  assert.deepEqual(product.categories, [
    { _key: category._id, _type: 'reference', _ref: category._id },
  ]);
  assert.equal(
    await applyMasterRow(client, previewMaster([imported], [product])[0], 'USD', new Map(), []),
    'skipped',
  );
  assert.equal(docs.length, 3);
});

test('blank optional category and condition preserve editorial values; existing categories match ignoring case', async () => {
  const category = existing({ _id: 'shoes', _type: 'clothingCategory', title: 'Shoes' });
  const item = existing({
    condition: 'Excellent',
    categories: [{ _key: 'old', _type: 'reference', _ref: 'shoes' }],
  });
  const { client, docs } = mock([item, category]);
  await applyMasterRow(client, previewMaster([record], [item])[0], 'USD', new Map(), []);
  const draft = docs.find((doc) => doc._id === 'drafts.owned')!;
  assert.equal(draft.condition, 'Excellent');
  assert.deepEqual(draft.categories, item.categories);
  await applyMasterRow(
    client,
    previewMaster([{ ...record, category: 'shoes' }], [draft])[0],
    'USD',
    new Map(),
    [],
  );
  assert.equal(docs.filter((doc) => doc._type === 'clothingCategory').length, 1);
  assert.equal((draft.categories as { _ref: string }[])[0]._ref, 'shoes');
});
