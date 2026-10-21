import { catalogSource } from '../../lib/catalog';
import { assertNoProductReferences } from '../catalog/model';
import type { useClient } from 'sanity';
export type InventoryClient = Pick<ReturnType<typeof useClient>, 'fetch' | 'patch' | 'create'>;

export const INVENTORY_API_VERSION = '2026-10-01';
export interface InventoryProduct {
  _id: string;
  _rev: string;
  _type: 'product';
  sku?: string;
  title?: string;
  description?: string;
  brandName?: string;
  size?: string;
  listingPrice?: number;
  vintedPrice?: { amount: number; currency: string };
  currency?: string;
  shoppingSection?: string;
  catalogSource?: 'closet' | 'amazon';
  archived?: boolean;
  affiliateLink?: boolean;
  saleStatus?: string;
  availability?: string;
}
export type SaleStatus = 'available' | 'sold';
export type InventorySort = 'status' | 'sku' | 'brand' | 'price';
export const publishedId = (id: string) => id.replace(/^drafts\./, '');
export async function isInventorySkuUnique(
  client: Pick<InventoryClient, 'fetch'>,
  documentId: string,
  sku: string,
) {
  const id = publishedId(documentId);
  const count = await client.fetch<number>(
    `count(*[_type == 'product' && !(_id in path('versions.**')) && !(_id in $ids) && lower(sku) == lower($sku)])`,
    { ids: [id, `drafts.${id}`], sku },
  );
  return count === 0;
}
export function inventoryStatus(p: InventoryProduct): SaleStatus | 'unknown' {
  if (p.saleStatus === 'available' || p.saleStatus === 'sold') return p.saleStatus;
  if (p.availability === 'available' || p.availability === 'sold') return p.availability;
  return 'unknown';
}
export function inventoryScope(documents: InventoryProduct[]) {
  const pairs = new Map<string, InventoryProduct>();
  for (const p of documents) {
    if (p._id.startsWith('versions.')) continue;
    const id = publishedId(p._id);
    if (!pairs.has(id) || p._id.startsWith('drafts.')) pairs.set(id, p);
  }
  return [...pairs.values()].filter(
    (p) => catalogSource(p) === 'closet' && p.affiliateLink !== true,
  );
}
export function inventoryRows(
  items: InventoryProduct[],
  search: string,
  filter: string,
  sort: InventorySort,
  descending = false,
) {
  const query = search.trim().toLocaleLowerCase();
  const rank = { available: 0, unknown: 1, sold: 2 };
  return items
    .filter(
      (p) =>
        (filter === 'all' || inventoryStatus(p) === filter) &&
        [p.sku, p.brandName, p.description, p.title].some((s) =>
          (s || '').toLocaleLowerCase().includes(query),
        ),
    )
    .sort((a, b) => {
      let order = 0;
      if (sort === 'status') order = rank[inventoryStatus(a)] - rank[inventoryStatus(b)];
      else if (sort === 'price') {
        if (a.listingPrice == null || b.listingPrice == null)
          return a.listingPrice == null ? (b.listingPrice == null ? 0 : 1) : -1;
        order =
          (a.currency || '').localeCompare(b.currency || '') || a.listingPrice - b.listingPrice;
      } else
        order = (sort === 'sku' ? a.sku || '' : a.brandName || '').localeCompare(
          sort === 'sku' ? b.sku || '' : b.brandName || '',
          'en',
          { numeric: true },
        );
      return (descending ? -order : order) || publishedId(a._id).localeCompare(publishedId(b._id));
    });
}
export function inventorySummary(items: InventoryProduct[]) {
  const totals: Record<string, number> = {};
  let available = 0,
    sold = 0,
    unknown = 0,
    unpriced = 0;
  for (const p of items) {
    const status = inventoryStatus(p);
    if (status === 'sold') sold++;
    else if (status === 'unknown') unknown++;
    else {
      available++;
      if (
        typeof p.listingPrice === 'number' &&
        Number.isFinite(p.listingPrice) &&
        p.listingPrice >= 0 &&
        /^[A-Z]{3}$/.test(p.currency || '')
      )
        totals[p.currency!] = (totals[p.currency!] || 0) + p.listingPrice;
      else unpriced++;
    }
  }
  return { available, sold, unknown, unpriced, totals };
}
export function inventoryPrice(price?: number, currency?: string) {
  if (price == null || !Number.isFinite(price) || !/^[A-Z]{3}$/.test(currency || ''))
    return 'Not set';
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(price);
  } catch {
    return 'Not set';
  }
}
export async function fetchInventory(client: InventoryClient) {
  const documents: InventoryProduct[] = [];
  let cursor = '';
  for (;;) {
    const batch = await client.fetch<InventoryProduct[]>(
      `*[_type == 'product' && !(_id in path('versions.**')) && _id > $cursor] | order(_id asc)[0...500]{_id,_rev,_type,sku,title,description,"brandName":brand->title,size,listingPrice,vintedPrice,currency,shoppingSection,catalogSource,archived,affiliateLink,saleStatus,availability}`,
      { cursor },
    );
    documents.push(...batch);
    if (batch.length < 500) break;
    cursor = batch[batch.length - 1]._id;
  }
  return inventoryScope(documents);
}
// Save only a draft. Preserve all existing editorial fields and never publish.
export async function saveInventoryStatus(client: InventoryClient, id: string, status: SaleStatus) {
  const baseId = publishedId(id);
  const draftId = `drafts.${baseId}`;
  const pair = await client.fetch<Record<string, unknown>[]>(
    `*[_type == 'product' && _id in $ids]`,
    { ids: [baseId, draftId] },
  );
  const draft = pair.find((p) => p._id === draftId);
  const source = draft || pair.find((p) => p._id === baseId);
  if (!source) throw new Error('This item was deleted. Refresh the inventory.');
  if (
    catalogSource(source as import('../../lib/catalog').CatalogFields) !== 'closet' ||
    source.affiliateLink === true
  )
    throw new Error('This item is no longer closet inventory. Refresh the inventory.');
  const fields = { saleStatus: status, availability: status };
  if (draft) {
    await client.patch(draftId).ifRevisionId(String(draft._rev)).set(fields).commit();
  } else {
    const copy = { ...source };
    for (const key of ['_rev', '_createdAt', '_updatedAt']) delete copy[key];
    // create (not createIfNotExists) fails safely if another editor creates a draft.
    await client.create({ ...copy, _id: draftId, _type: 'product', ...fields });
  }
}

export type InventoryDeleteClient = Pick<ReturnType<typeof useClient>, 'fetch' | 'transaction'>;
/** Delete only this product's draft/published pair; references are enforced by Sanity. */
export async function deleteInventoryItem(client: InventoryDeleteClient, item: InventoryProduct) {
  if (item._id.startsWith('versions.'))
    throw new Error('Release versions must be managed in Studio.');
  const id = publishedId(item._id);
  const documents = await client.fetch<InventoryProduct[]>(
    '*[_id in $ids]{_id,_rev,_type,shoppingSection,affiliateLink}',
    { ids: [id, `drafts.${id}`] },
  );
  const current = documents.find((document) => document._id === item._id);
  if (
    !current ||
    current._rev !== item._rev ||
    (!item._id.startsWith('drafts.') &&
      documents.some((document) => document._id.startsWith('drafts.')))
  )
    throw new Error('This item changed. Refresh inventory and review it before deleting.');
  if (
    documents.some((document) => document._type !== 'product') ||
    !inventoryScope(documents).length
  )
    throw new Error('This item is no longer closet inventory. Refresh before deleting.');
  await assertNoProductReferences(client, id);
  let transaction = client.transaction();
  for (const document of documents) {
    // The no-op patch adds an atomic revision precondition before each deletion.
    transaction = transaction.patch(document._id, (patch) =>
      patch.ifRevisionId(document._rev).set({}),
    );
    transaction = transaction.delete(document._id);
  }
  await transaction.commit({ visibility: 'sync' });
}

export type PublicationMode = 'publish' | 'unpublish';
export type InventoryPublicationClient = Pick<ReturnType<typeof useClient>, 'fetch' | 'action'>;
export type InventoryDocument = InventoryProduct & {
  _createdAt: string;
  _updatedAt: string;
  [key: string]: unknown;
};
/** Use native lifecycle actions so unpublishing retains editable content and references are checked. */
export async function changeInventoryPublication(
  client: InventoryPublicationClient,
  item: InventoryProduct,
  mode: PublicationMode,
  validate: (document: InventoryDocument) => Promise<{ level: string; message: string }[]>,
) {
  const id = publishedId(item._id);
  const draftId = `drafts.${id}`;
  const pair = await client.fetch<InventoryDocument[]>('*[_type == "product" && _id in $ids]', {
    ids: [id, draftId],
  });
  const draft = pair.find((document) => document._id === draftId);
  const published = pair.find((document) => document._id === id);
  const current = draft || published;
  if (!current || current._id !== item._id || current._rev !== item._rev)
    throw new Error('This item changed. Refresh inventory and review it before continuing.');
  if (!inventoryScope(pair).length || item._id.startsWith('versions.'))
    throw new Error('This item is no longer closet inventory. Refresh inventory.');
  if (mode === 'publish') {
    if (!draft) throw new Error('There is no draft to publish. Refresh inventory.');
    const errors = (await validate(draft)).filter((marker) => marker.level === 'error');
    if (errors.length)
      throw new Error(
        `Fix these issues in the product editor before publishing: ${errors.map((error) => error.message).join('; ')}`,
      );
    await client.action({
      actionType: 'sanity.action.document.publish',
      draftId,
      publishedId: id,
      ifDraftRevisionId: draft._rev,
      ...(published ? { ifPublishedRevisionId: published._rev } : {}),
    });
  } else {
    if (!published || draft) throw new Error('Publication state changed. Refresh inventory.');
    await client.action({
      actionType: 'sanity.action.document.unpublish',
      draftId,
      publishedId: id,
    });
  }
}
