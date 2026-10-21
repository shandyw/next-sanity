import { catalogSource } from '../../lib/catalog';
import type { useClient } from 'sanity';
type SanityClient = ReturnType<typeof useClient>;
import {
  dedupeWishes,
  wishlistDraft,
  wishIdentity,
  type ReviewWish,
  type WishCsvRow,
  amazonProduct,
} from '../../lib/review-wishlist';
export const WISHLIST_API = '2026-09-01';
export async function fetchWishlistProducts(client: SanityClient) {
  const result: ReviewWish[] = [];
  let after = '';
  while (true) {
    const batch = await client.fetch<ReviewWish[]>(
      '*[_type=="product" && !(_id in path("versions.**")) && _id > $after] | order(_id asc)[0...200]',
      { after },
    );
    result.push(...batch);
    if (batch.length < 200) break;
    after = batch[batch.length - 1]._id;
  }
  return dedupeWishes(result);
}
export function matchWishlistRow(row: WishCsvRow, products: ReviewWish[]) {
  const matches = products.filter(
    (item) =>
      item.amazonAsin === row.asin ||
      amazonProduct(item.purchaseUrl)?.asin === row.asin ||
      wishIdentity(item._id) === `amazon-find-${row.asin.toLowerCase()}`,
  );
  if (matches.length > 1)
    throw new Error(`Multiple products match ${row.asin}. Resolve duplicates in Studio.`);
  if (
    matches[0] &&
    catalogSource(matches[0] as import('../../lib/catalog').CatalogFields) !== 'amazon'
  )
    throw new Error(`${row.asin} matches a closet item. It will not be overwritten.`);
  return matches[0];
}
export async function importWishlistRow(
  client: SanityClient,
  row: WishCsvRow,
  expected?: ReviewWish,
) {
  const products = await fetchWishlistProducts(client);
  const current = matchWishlistRow(row, products);
  if (current?._id !== expected?._id || current?._rev !== expected?._rev)
    throw new Error('Product changed since preview. Preview the CSV again.');
  if (
    current &&
    !('sourceSnapshot' in current) &&
    (current.importedFacts as { fingerprint?: string } | undefined)?.fingerprint ===
      JSON.stringify(row)
  )
    return 'unchanged';
  const draft = wishlistDraft(row, current);
  if (!current) {
    await client.create(draft);
  } else if (current._id.startsWith('drafts.')) {
    const { _id, ...fields } = draft;
    await client.patch(_id).ifRevisionId(current._rev).set(fields).unset(['sourceSnapshot']).commit();
  } else {
    await client
      .transaction()
      .patch(current._id, (patch) => patch.ifRevisionId(current._rev).set({}))
      .create(draft)
      .commit();
  }
  return current ? 'updated' : 'created';
}
