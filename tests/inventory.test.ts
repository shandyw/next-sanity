import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchInventory,
  deleteInventoryItem,
  type InventoryDeleteClient,
  isInventorySkuUnique,
  inventoryPrice,
  inventoryRows,
  inventoryScope,
  inventoryStatus,
  inventorySummary,
  saveInventoryStatus,
  type InventoryClient,
  type InventoryProduct,
} from '../sanity/inventory/model';
import { importRecordSchema, listingUpdate } from '../lib/import-products';

const item = (id: string, extra: Partial<InventoryProduct> = {}): InventoryProduct => ({
  _id: id,
  _rev: 'r1',
  _type: 'product',
  title: id,
  ...extra,
});
test('SKU uniqueness ignores the same draft/published pair and preserves zeroes', async () => {
  let query = '',
    parameters: unknown;
  let count = 0;
  const client = {
    fetch: async (q: string, params: unknown) => {
      query = q;
      parameters = params;
      return count;
    },
  } as unknown as InventoryClient;
  assert.equal(await isInventorySkuUnique(client, 'drafts.a', 'CGR-001'), true);
  assert.deepEqual(parameters, { ids: ['a', 'drafts.a'], sku: 'CGR-001' });
  assert.match(query, /lower\(sku\) == lower\(\$sku\)/);
  count = 1;
  assert.equal(await isInventorySkuUnique(client, 'a', 'cgr-001'), false);
});
test('draft/published pairs count once and classification uses the draft', () => {
  const scope = inventoryScope([
    item('a'),
    item('drafts.a', { availability: 'sold' }),
    item('b', { shoppingSection: 'finds' }),
    item('c', { affiliateLink: true }),
    item('d'),
    item('drafts.d', { shoppingSection: 'finds' }),
    item('versions.release.e'),
  ]);
  assert.deepEqual(
    scope.map((p) => p._id),
    ['drafts.a'],
  );
  assert.equal(inventoryStatus(scope[0]), 'sold');
  assert.equal(inventoryStatus(item('reserved', { availability: 'reserved' })), 'unknown');
  assert.equal(inventoryStatus(item('missing')), 'unknown');
  assert.equal(
    inventoryStatus(item('override', { saleStatus: 'sold', availability: 'available' })),
    'sold',
  );
});
test('search, counts, sorting and currency totals apply across full inventory', () => {
  const items = [
    item('a', {
      sku: 'CGR-001',
      brandName: 'Acme',
      description: 'Linen blouse',
      availability: 'available',
      listingPrice: 20,
      currency: 'USD',
    }),
    item('b', { sku: 'CGR-010', saleStatus: 'sold', listingPrice: 100, currency: 'USD' }),
    item('c', { saleStatus: 'available', listingPrice: 7, currency: 'GBP' }),
    item('d', { availability: 'unknown' }),
    item('e', { saleStatus: 'available' }),
  ];
  assert.equal(inventoryRows(items, 'cgr-001', 'all', 'sku')[0].sku, 'CGR-001');
  assert.equal(inventoryRows(items, 'ACME', 'available', 'brand').length, 1);
  assert.equal(inventoryRows(items, 'linen', 'all', 'price').length, 1);
  assert.equal(inventoryRows(items, 'absent', 'all', 'status').length, 0);
  assert.equal(inventoryStatus(inventoryRows(items, '', 'all', 'status').at(-1)!), 'sold');
  assert.equal(inventoryRows(items, '', 'sold', 'sku').length, 1);
  assert.deepEqual(
    inventoryRows(items.slice(0, 2), '', 'all', 'sku', true).map((p) => p.sku),
    ['CGR-010', 'CGR-001'],
  );
  assert.deepEqual(inventorySummary(items), {
    available: 3,
    sold: 1,
    unknown: 1,
    unpriced: 1,
    totals: { USD: 20, GBP: 7 },
  });
  assert.equal(inventoryPrice(20, 'USD'), '$20.00');
  assert.equal(inventoryPrice(20), '$20.00');
  assert.equal(inventoryPrice(20, 'USD\u200b'), 'Not set');
});
test('cursor fetching includes products beyond the first batch', async () => {
  const batch = Array.from({ length: 500 }, (_, i) => item(`a${String(i).padStart(3, '0')}`));
  const cursors: string[] = [];
  const client = {
    fetch: async (_query: string, params: { cursor: string }) => {
      cursors.push(params.cursor);
      return params.cursor ? [item('z', { availability: 'sold' })] : batch;
    },
  } as unknown as InventoryClient;
  const result = await fetchInventory(client);
  assert.equal(result.length, 501);
  assert.deepEqual(cursors, ['', 'a499']);
});
test('quick changes create drafts with existing content without publishing', async () => {
  let created: Record<string, unknown> = {};
  const published = {
    ...item('a', { availability: 'available' }),
    description: 'Editorial content',
    sku: 'CGR-001',
    _createdAt: 'date',
  };
  const client = {
    fetch: async () => [published],
    create: async (doc: Record<string, unknown>) => {
      created = doc;
    },
  } as unknown as InventoryClient;
  await saveInventoryStatus(client, 'a', 'sold');
  assert.equal(created._id, 'drafts.a');
  assert.equal(created.description, 'Editorial content');
  assert.equal(created.sku, 'CGR-001');
  assert.equal(created.saleStatus, 'sold');
  assert.equal(created.availability, 'sold');
  assert.equal(created._rev, undefined);
  assert.equal(published.availability, 'available');
});
test('existing drafts receive a revision guarded status patch only', async () => {
  let target = '',
    revision = '',
    fields: unknown;
  const patch = {
    ifRevisionId: (rev: string) => {
      revision = rev;
      return patch;
    },
    set: (value: unknown) => {
      fields = value;
      return patch;
    },
    commit: async () => {},
  };
  const client = {
    fetch: async () => [item('a'), item('drafts.a', { _rev: 'draft-rev' })],
    patch: (id: string) => {
      target = id;
      return patch;
    },
  } as unknown as InventoryClient;
  await saveInventoryStatus(client, 'a', 'available');
  assert.equal(target, 'drafts.a');
  assert.equal(revision, 'draft-rev');
  assert.deepEqual(fields, { saleStatus: 'available', availability: 'available' });
  const excluded = {
    fetch: async () => [item('a', { affiliateLink: true })],
  } as unknown as InventoryClient;
  await assert.rejects(() => saveInventoryStatus(excluded, 'a', 'sold'), /no longer closet/);
});
test('imports cannot change SKUs, sale statuses or manually controlled availability', () => {
  const record = importRecordSchema.parse({
    externalListingId: '123',
    title: 'Blouse',
    listingPrice: 5,
    currency: 'USD',
    availability: 'available',
    vintedUrl: 'https://www.vinted.com/items/123-blouse',
    lastSuccessfullyCheckedAt: '2026-09-01T00:00:00Z',
  });
  assert.equal(importRecordSchema.safeParse({ ...record, sku: 'CGR-001' }).success, false);
  assert.equal(importRecordSchema.safeParse({ ...record, saleStatus: 'available' }).success, false);
  const patch = listingUpdate(record, { _id: 'a', _rev: 'r', saleStatus: 'sold' });
  assert.ok(!('availability' in patch));
  assert.ok(!('saleStatus' in patch));
  assert.ok(!('sku' in patch));
  assert.equal(listingUpdate(record).availability, 'available');
});

test('deletion guards and removes only the selected draft/published pair in one transaction', async () => {
  const docs = [item('a'), item('drafts.a')];
  const operations: string[] = [];
  let committed = false;
  const transaction = {
    patch(id: string, callback: (patch: unknown) => unknown) {
      const patch = {
        ifRevisionId(rev: string) {
          operations.push(`guard:${id}:${rev}`);
          return patch;
        },
        set() {
          return patch;
        },
      };
      callback(patch);
      return transaction;
    },
    delete(id: string) {
      operations.push(`delete:${id}`);
      return transaction;
    },
    async commit() {
      committed = true;
    },
  };
  const client = {
    fetch: async (q: string) => (q.includes('references(') ? [] : docs),
    transaction: () => transaction,
  } as unknown as InventoryDeleteClient;
  await deleteInventoryItem(client, docs[1]);
  assert.deepEqual(operations, ['guard:a:r1', 'delete:a', 'guard:drafts.a:r1', 'delete:drafts.a']);
  assert.equal(committed, true);
  operations.length = 0;
  await assert.rejects(
    () => deleteInventoryItem(client, item('drafts.a', { _rev: 'old' })),
    /changed/,
  );
  await assert.rejects(() => deleteInventoryItem(client, item('a')), /changed/);
  assert.deepEqual(operations, []);
  await assert.rejects(
    () =>
      deleteInventoryItem(
        {
          fetch: async () => [item('a', { shoppingSection: 'finds' })],
          transaction: () => transaction,
        } as unknown as InventoryDeleteClient,
        item('a'),
      ),
    /no longer closet/,
  );
  await assert.rejects(
    () => deleteInventoryItem(client, item('versions.release.a')),
    /Release versions/,
  );
});

test('publication validates the current draft and dispatches revision-guarded native actions', async () => {
  const { changeInventoryPublication } = await import('../sanity/inventory/model');
  const draft = {
    ...item('drafts.a', { title: 'Draft editorial changes' }),
    _createdAt: '2026-01-01',
    _updatedAt: '2026-01-01',
  };
  const published = { ...draft, _id: 'a', _rev: 'pub', title: 'Old title' };
  let action: unknown;
  let calls = 0;
  const client = {
    fetch: async () => [published, draft],
    action: async (value: unknown) => {
      action = value;
      calls++;
    },
  } as unknown as import('../sanity/inventory/model').InventoryPublicationClient;
  await changeInventoryPublication(client, draft, 'publish', async (document) => {
    assert.equal(document.title, 'Draft editorial changes');
    return [{ level: 'warning', message: 'Optional warning' }];
  });
  assert.deepEqual(action, {
    actionType: 'sanity.action.document.publish',
    draftId: 'drafts.a',
    publishedId: 'a',
    ifDraftRevisionId: 'r1',
    ifPublishedRevisionId: 'pub',
  });
  await assert.rejects(
    () =>
      changeInventoryPublication(client, draft, 'publish', async () => [
        { level: 'error', message: 'Photos required' },
      ]),
    /Photos required/,
  );
  await assert.rejects(
    () =>
      changeInventoryPublication(client, { ...draft, _rev: 'stale' }, 'publish', async () => []),
    /changed/,
  );
  assert.equal(calls, 1);
});
test('Set to Draft uses unpublish, protects changed pairs and propagates reference/permission errors', async () => {
  const { changeInventoryPublication } = await import('../sanity/inventory/model');
  const published = { ...item('a'), _createdAt: '2026-01-01', _updatedAt: '2026-01-01' };
  let docs = [published];
  let action: unknown;
  let fail = false;
  const client = {
    fetch: async () => docs,
    action: async (value: unknown) => {
      if (fail) throw Error('Referenced item');
      action = value;
    },
  } as unknown as import('../sanity/inventory/model').InventoryPublicationClient;
  await changeInventoryPublication(client, published, 'unpublish', async () => {
    throw Error('Unpublish must not require publishing validation');
  });
  assert.deepEqual(action, {
    actionType: 'sanity.action.document.unpublish',
    draftId: 'drafts.a',
    publishedId: 'a',
  });
  docs = [published, { ...published, _id: 'drafts.a' }];
  await assert.rejects(
    () => changeInventoryPublication(client, published, 'unpublish', async () => []),
    /changed/,
  );
  docs = [{ ...published, shoppingSection: 'finds' }];
  await assert.rejects(
    () => changeInventoryPublication(client, published, 'unpublish', async () => []),
    /no longer closet/,
  );
  docs = [published];
  fail = true;
  await assert.rejects(
    () => changeInventoryPublication(client, published, 'unpublish', async () => []),
    /Referenced item/,
  );
});
