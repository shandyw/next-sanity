import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyImport,
  fetchImportTargets,
  primaryTargets,
  previewImport,
  type ImportTarget,
  type PoshmarkRecord,
} from '../sanity/imports/model';
import { inspectPoshmarkCsv } from '../lib/poshmark-import';
import { stableProductId } from '../lib/import-products';
import type { useClient } from 'sanity';
const source = 'poshmark-cgrshop';
const record: PoshmarkRecord = {
  closetPlatform: 'poshmark',
  externalListingId: 'SH-001',
  title: 'Ryka Summit Trail Hiking Boots',
  listingPrice: 54,
  currency: 'USD',
  availability: 'available',
  poshmarkUrl: 'https://poshmark.com/listing/Ryka-Boots-6acf9e893559d52c099ce643',
  lastSuccessfullyCheckedAt: '2026-01-01T00:00:00Z',
};
function mock(initial: ImportTarget[] = []) {
  const docs = structuredClone(initial);
  const client = {
    withConfig: () => client,
    fetch: async (_query: string, params: Record<string, unknown>) =>
      params.cursor !== undefined
        ? docs
            .filter((doc) => doc._id > (params.cursor as string))
            .sort((a, b) => a._id.localeCompare(b._id))
            .slice(0, 500)
        : docs.filter(
            (doc) =>
              (doc.importSource === params.source && doc.externalListingId === params.externalId) ||
              doc.poshmarkUrl === params.url ||
              doc.purchaseUrl === params.url ||
              (params.ids as string[]).includes(doc._id),
          ),
    getDocuments: async (ids: string[]) =>
      ids.map((id) => docs.find((doc) => doc._id === id) || null),
    create: async (doc: ImportTarget) => {
      if (docs.some((item) => item._id === doc._id)) throw Error('duplicate');
      docs.push({ ...doc, _rev: 'created' });
    },
    patch: (id: string) => {
      let rev = '',
        fields = {};
      const patch = {
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
  };
  return { docs, client: client as unknown as ReturnType<typeof useClient> };
}
const existing = (extra: Partial<ImportTarget> = {}): ImportTarget => ({
  _id: 'owned',
  _type: 'product',
  _rev: 'r1',
  title: record.title,
  shoppingSection: 'closet',
  ...extra,
});
test('Studio detects official preamble, date, headings and seller source', () => {
  const detected = inspectPoshmarkCsv(
    'Inventory Report for @CGRShop\nInventory as of 10/14/2026\n\nListing SKU,Listing Title,Current Listing Price,Listing URL\nSH-001,Boots,54,https://poshmark.com/listing/Boots-123\n',
  );
  assert.equal(detected.headerRow, 4);
  assert.equal(detected.source, source);
  assert.equal(detected.reportDate, '2026-10-14');
  assert.equal(detected.columns.listingPrice, 'Current Listing Price');
});
test('Studio preview deduplicates pairs and requires explicit matching for manual items', () => {
  const pub = existing();
  const draft = existing({ _id: 'drafts.owned', sku: 'SH-001' });
  const targets = primaryTargets([pub, draft]);
  assert.equal(targets.length, 1);
  assert.equal(targets[0]._id, 'drafts.owned');
  const row = previewImport([record], source, targets)[0];
  assert.equal(row.choice, 'skip');
  assert.equal(row.candidates.length, 1);
  assert.equal(
    previewImport([record], source, [
      existing({ shoppingSection: 'finds', poshmarkUrl: record.poshmarkUrl }),
    ])[0].choice,
    'skip',
  );
});
test('Studio creates stable drafts, rejects duplicates and retains same-report reruns', async () => {
  const { client, docs } = mock();
  const row = previewImport([record], source, [])[0];
  assert.equal(await applyImport(client, row, source), 'created');
  assert.equal(docs[0]._id, `drafts.${stableProductId(source, record.externalListingId)}`);
  assert.equal(docs[0].sku, undefined);
  assert.equal(docs[0].saleStatus, undefined);
  await assert.rejects(() => applyImport(client, row, source), /now exists/);
  const again = previewImport([record], source, docs)[0];
  assert.equal(again.choice, 'skip');
});
test('Manual matching copies all editorial fields to a draft and preserves sold status', async () => {
  const original = existing({
    sku: 'CGR-001',
    description: 'Editorial copy',
    photos: [{ asset: { _ref: 'owned-image' } }],
    saleStatus: 'sold',
    availability: 'sold',
    purchaseUrl: 'https://www.vinted.com/items/123',
    relatedReview: { _ref: 'review1' },
  });
  const { client, docs } = mock([original]);
  assert.equal(
    await applyImport(
      client,
      { record, choice: 'link', target: original, candidates: [], note: '' },
      source,
    ),
    'updated',
  );
  assert.deepEqual(docs[0], original);
  const draft = docs[1];
  assert.equal(draft._id, 'drafts.owned');
  assert.equal(draft.sku, 'CGR-001');
  assert.equal(draft.saleStatus, 'sold');
  assert.equal(draft.availability, 'sold');
  assert.deepEqual(draft.photos, original.photos);
  assert.deepEqual(draft.relatedReview, original.relatedReview);
  assert.equal(draft.purchaseUrl, record.poshmarkUrl);
  assert.equal(draft.dataSource, 'import');
});
test('Studio updates existing drafts without publishing unrelated edits; refuses changed and disabled items', async () => {
  const original = existing({
    _id: 'drafts.owned',
    dataSource: 'import',
    importSource: source,
    externalListingId: record.externalListingId,
    closetPlatform: 'poshmark',
    title: 'Unpublished editorial title',
    availability: 'reserved',
  });
  const { client, docs } = mock([original]);
  const row = previewImport([record], source, structuredClone(docs))[0];
  assert.equal(row.choice, 'update');
  await applyImport(client, row, source);
  assert.equal(docs.length, 1);
  assert.equal(docs[0].title, original.title);
  assert.equal(docs[0].availability, 'reserved');
  await assert.rejects(() => applyImport(client, row, source), /changed after preview/);
  const disabled = existing({ importEnabled: false });
  const second = mock([disabled]);
  await assert.rejects(
    () =>
      applyImport(
        second.client,
        { record, choice: 'link', target: disabled, candidates: [], note: '' },
        source,
      ),
    /not eligible/,
  );
});
test('Studio fetch pages include full dataset and validation blocks unsafe URLs before mutation', async () => {
  const initial = Array.from({ length: 520 }, (_, i) =>
    existing({ _id: `item${String(i).padStart(4, '0')}` }),
  );
  const { client, docs } = mock(initial);
  assert.equal((await fetchImportTargets(client)).length, 520);
  await assert.rejects(() =>
    applyImport(
      client,
      {
        record: { ...record, poshmarkUrl: 'http://127.0.0.1' },
        choice: 'create',
        candidates: [],
        note: '',
      },
      source,
    ),
  );
  assert.equal(docs.length, 520);
});
