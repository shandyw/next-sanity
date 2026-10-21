import { catalogSource } from '../../lib/catalog';
import type { useClient } from 'sanity';
import { publishedId } from '../inventory/model';
type SanityClient = ReturnType<typeof useClient>;

export interface ImportTarget {
  _id: string;
  _rev: string;
  _type: string;
  title?: string;
  sku?: string;
  shoppingSection?: string;
  affiliateLink?: boolean;
  photos?: unknown[];
  dataSource?: string;
  importSource?: string;
  externalListingId?: string;
  importEnabled?: boolean;
  purchaseUrl?: string;
  saleStatus?: string;
  availability?: string;
  listingPrice?: number;
  currency?: string;
  lastSuccessfullyCheckedAt?: string;
  [key: string]: unknown;
}
export const eligible = (item: ImportTarget) =>
  item._type === 'product' &&
  catalogSource(item as import('../../lib/catalog').CatalogFields) === 'closet' &&
  item.affiliateLink !== true;
export function primaryTargets(documents: ImportTarget[]) {
  const pairs = new Map<string, ImportTarget>();
  for (const item of documents) {
    if (item._id.startsWith('versions.')) continue;
    const id = publishedId(item._id);
    if (!pairs.has(id) || item._id.startsWith('drafts.')) pairs.set(id, item);
  }
  return [...pairs.values()];
}
export async function fetchImportTargets(base: SanityClient) {
  const client = base.withConfig({ perspective: 'raw', useCdn: false, stega: false });
  const all: ImportTarget[] = [];
  let cursor = '';
  for (;;) {
    const batch = await client.fetch<ImportTarget[]>(
      `*[_type=='product' && !(_id in path('versions.**')) && _id>$cursor] | order(_id asc)[0...500]`,
      { cursor },
    );
    all.push(...batch);
    if (batch.length < 500) break;
    cursor = batch[batch.length - 1]._id;
  }
  return primaryTargets(all);
}
