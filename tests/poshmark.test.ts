import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { poshmarkUrl, closetShopUrl } from '../lib/urls';
import { defaultItemPricingInputs } from '../lib/pricing/contracts';
import { closetPlatform } from '../lib/shopping';
import {
  importRecordSchema,
  createProduct,
  listingUpdate,
  updateDecision,
} from '../lib/import-products';
import {
  poshmarkMappingSchema,
  parseInventoryCsv,
  convertPoshmarkInventory,
} from '../lib/poshmark-import';
import { ProductAction } from '../components/ProductAction';
import { ClosetShopLink } from '../components/ClosetShopLink';
import type { DocumentContent } from '../lib/types';

const record = {
  closetPlatform: 'poshmark' as const,
  externalListingId: '1234567890abcdef12345678',
  title: 'Owned coat',
  listingPrice: 24,
  currency: 'USD',
  availability: 'available',
  poshmarkUrl: 'https://poshmark.com/listing/Owned-coat-1234567890abcdef12345678',
  lastSuccessfullyCheckedAt: '2026-01-01T12:00:00Z',
};
const product: DocumentContent = {
  _id: 'owned-coat',
  _type: 'product',
  slug: 'owned-coat',
  title: 'Owned coat',
  closetPlatform: 'poshmark',
  poshmarkUrl: record.poshmarkUrl,
  availability: 'available',
  listingPrice: 24,
  currency: 'USD',
};
const mapping = poshmarkMappingSchema.parse({
  source: 'poshmark-fixture',
  currency: 'USD',
  columns: { externalListingId: 'ID', title: 'Title', listingPrice: 'Price' },
});

test('marketplace URLs reject untrusted hosts, profile/listing mixups and unsafe protocols', () => {
  assert.equal(poshmarkUrl(record.poshmarkUrl + '?tracking=1#details'), record.poshmarkUrl);
  for (const url of [
    'http://poshmark.com/listing/test',
    'https://poshmark.com.evil.test/listing/test',
    'https://user:pass@poshmark.com/listing/test',
    'https://poshmark.com/closet/user',
    'https://localhost/listing/test',
  ])
    assert.equal(poshmarkUrl(url), undefined);
  assert.equal(
    closetShopUrl('https://poshmark.com/closet/fixture', 'poshmark'),
    'https://poshmark.com/closet/fixture',
  );
  assert.equal(closetShopUrl('https://poshmark.ca/closet/fixture', 'vinted'), undefined);
  assert.equal(closetPlatform({ ...product, closetPlatform: undefined }), 'vinted');
  assert.equal(defaultItemPricingInputs(product).channel, 'Poshmark');
  assert.equal(defaultItemPricingInputs({}).channel, 'Vinted');
});

test('Poshmark actions, sold states and associated closet links work without public prices', () => {
  const action = (p: DocumentContent) =>
    renderToStaticMarkup(createElement(ProductAction, { product: p }));
  assert.match(action(product), /Buy on Poshmark/);
  assert.match(action(product), /current listing on Poshmark/);
  for (const availability of ['sold', 'reserved', 'unknown'] as const)
    assert.doesNotMatch(action({ ...product, availability }), /Buy on Poshmark/);
  assert.doesNotMatch(
    action({ ...product, poshmarkUrl: undefined, vintedUrl: 'https://vinted.com/items/1-test' }),
    /Buy on Poshmark/,
  );
  const settings = { poshmarkShopUrl: 'https://poshmark.com/closet/fixture' };
  assert.match(
    renderToStaticMarkup(createElement(ClosetShopLink, { product, settings })),
    /Visit my Poshmark closet/,
  );
});

test('normalized Poshmark imports protect editorial ownership and stable identity', () => {
  const parsed = importRecordSchema.parse(record);
  const created = createProduct('poshmark-fixture', parsed);
  assert.equal(created.closetPlatform, 'poshmark');
  assert.equal(created.shoppingSection, 'closet');
  const existing = {
    _id: created._id,
    _rev: 'fixture',
    dataSource: 'import',
    importSource: 'poshmark-fixture',
    externalListingId: record.externalListingId,
    importEnabled: true,
    closetPlatform: 'poshmark',
    saleStatus: 'sold',
  };
  assert.equal(updateDecision(existing, 'poshmark-fixture', parsed), 'update');
  assert.equal(
    updateDecision({ ...existing, closetPlatform: 'vinted' }, 'poshmark-fixture', parsed),
    'marketplace is editorially managed',
  );
  assert.deepEqual(Object.keys(listingUpdate(parsed, existing)).sort(), [
    'currency',
    'lastSuccessfullyCheckedAt',
    'listingPrice',
    'poshmarkUrl',
  ]);
  assert.equal(importRecordSchema.safeParse({ ...record, sku: 'CGR-001' }).success, false);
  assert.equal(
    importRecordSchema.safeParse({ ...record, vintedUrl: 'https://vinted.com/items/1-test' })
      .success,
    false,
  );
});

test('CSV converter handles quoted data, bad rows, duplicate IDs and explicit mappings', () => {
  const csv =
    '\uFEFFID,Title,Price\r\n1234567890abcdef12345678,"Coat, with \"\"pockets\"\"",24.50\r\n1234567890abcdef12345678,Duplicate,10\r\n';
  const result = convertPoshmarkInventory(csv, mapping, record.lastSuccessfullyCheckedAt);
  assert.deepEqual(result.summary, { converted: 1, skipped: 1, failed: 0 });
  assert.equal(result.envelope.products[0].title, 'Coat, with "pockets"');
  assert.equal(result.envelope.products[0].availability, 'available');
  assert.equal(result.envelope.products[0].listingPrice, 24.5);
  assert.throws(() => parseInventoryCsv('ID,ID\na,b'), /unique/);
  assert.throws(() => parseInventoryCsv('ID,Title\na,"unfinished'), /unclosed/);
  assert.throws(
    () =>
      convertPoshmarkInventory('ID,Other,Price\na,b,1', mapping, record.lastSuccessfullyCheckedAt),
    /missing/,
  );
  assert.equal(
    convertPoshmarkInventory(
      'ID,Title,Price\nshort,Coat,24',
      mapping,
      record.lastSuccessfullyCheckedAt,
    ).summary.failed,
    1,
  );
});

test('offline Poshmark CLI validates without writes, emits JSON and refuses overwrites', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cgr-poshmark-'));
  try {
    const csv = join(dir, 'inventory.csv'),
      map = join(dir, 'mapping.json'),
      output = join(dir, 'products.json');
    writeFileSync(csv, 'ID,Title,Price\n1234567890abcdef12345678,Owned coat,24\n');
    writeFileSync(map, JSON.stringify(mapping));
    const args = [
      '--import',
      'tsx',
      'scripts/convert-poshmark.ts',
      '--file',
      csv,
      '--mapping',
      map,
      '--checked-at',
      record.lastSuccessfullyCheckedAt,
    ];
    let run = spawnSync(process.execPath, [...args, '--dry-run'], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /"converted":1/);
    run = spawnSync(process.execPath, [...args, '--out', output], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(JSON.parse(readFileSync(output, 'utf8')).products[0].closetPlatform, 'poshmark');
    run = spawnSync(process.execPath, [...args, '--out', output], { encoding: 'utf8' });
    assert.equal(run.status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('official report preambles and seller SKUs require separately supplied listing links', () => {
  const csv =
    'Poshmark Inventory Report for @fixture\nInventory as of 10/14/2026\nNotes:\nOnly available items\nAdditional note\n\nListing SKU,Listing Title,Current Listing Price,Size\nSH-001,Owned boots,$54.00,9\n';
  const config = poshmarkMappingSchema.parse({
    source: 'poshmark-fixture',
    currency: 'USD',
    headerRow: 7,
    columns: {
      externalListingId: 'Listing SKU',
      title: 'Listing Title',
      listingPrice: 'Current Listing Price',
      size: 'Size',
    },
  });
  const missing = convertPoshmarkInventory(csv, config, record.lastSuccessfullyCheckedAt);
  assert.equal(missing.summary.failed, 1);
  assert.match(missing.errors[0], /Row 8: Listing SH-001 needs/);
  const result = convertPoshmarkInventory(
    csv,
    { ...config, listingUrls: { 'SH-001': record.poshmarkUrl } },
    record.lastSuccessfullyCheckedAt,
  );
  assert.deepEqual(result.summary, { converted: 1, skipped: 0, failed: 0 });
  assert.equal(result.envelope.products[0].externalListingId, 'SH-001');
  assert.equal(result.envelope.products[0].listingPrice, 54);
  assert.equal(result.envelope.products[0].size, '9');
  assert.equal('sku' in result.envelope.products[0], false);
});
