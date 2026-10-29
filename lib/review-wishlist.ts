import { catalogSource } from './catalog';
import { parseInventoryCsv } from './csv';
import type { ContentPhoto } from './types';
export interface ReviewWish {
  _id: string;
  _rev: string;
  _type?: 'product';
  _updatedAt?: string;
  _createdAt?: string;
  title: string;
  slug?: { current?: string };
  asin?: string;
  description?: string;
  productUrl?: string;
  importedImageUrl?: string;
  shoppingSection?: string;
  onReviewWishlist?: boolean;
  amazonAsin?: string;
  purchaseUrl?: string;
  photos?: ContentPhoto[];
  priority?: 'low' | 'medium' | 'high';
  requestedQuantity?: number;
  receivedQuantity?: number;
  hidden?: boolean;
  [key: string]: unknown;
}
export function amazonProduct(value?: string) {
  try {
    const url = new URL(value || '');
    const asin = url.pathname
      .match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([a-z0-9]{10})(?:\/|$)/i)?.[1]
      .toUpperCase();
    if (
      url.protocol === 'https:' &&
      /^(www\.)?amazon\.com$/.test(url.hostname) &&
      !url.username &&
      !url.password &&
      asin
    )
      return { asin, url: `https://www.amazon.com/dp/${asin}` };
  } catch {}
}
export function amazonImage(value?: string) {
  try {
    const url = new URL(value || '');
    if (
      url.protocol === 'https:' &&
      url.hostname === 'm.media-amazon.com' &&
      url.pathname.startsWith('/images/I/') &&
      !url.username &&
      !url.password
    )
      return url.href;
  } catch {}
}
export function wishReceived(item: ReviewWish) {
  return (item.receivedQuantity || 0) >= (item.requestedQuantity || 1);
}
export function wishIdentity(id: string) {
  return id.replace(/^drafts\./, '');
}
export function dedupeWishes(items: ReviewWish[]) {
  const result = new Map<string, ReviewWish>();
  for (const item of items) {
    const key = wishIdentity(item._id);
    if (!result.has(key) || item._id.startsWith('drafts.')) result.set(key, item);
  }
  return [...result.values()];
}
export interface WishCsvRow {
  asin: string;
  title: string;
  productUrl: string;
  sourceImageUrl?: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  requestedQuantity: number;
  receivedQuantity: number;
  referencePrice: string;
}
export function parseReviewWishlist(csv: string): WishCsvRow[] {
  if (csv.length > 2_000_000) throw new Error('CSV must be smaller than 2 MB.');
  const { headers, rows } = parseInventoryCsv(csv);
  const normalized = headers.map((h) => h.toLowerCase());
  for (const header of ['name', 'product url', 'image url'])
    if (!normalized.includes(header)) throw new Error(`Missing CSV column: ${header}.`);
  if (new Set(normalized).size !== headers.length) throw new Error('Duplicate CSV columns.');
  if (!rows.length || rows.length > 1000) throw new Error('Choose a CSV with 1–1,000 items.');
  const seen = new Set<string>();
  return rows.map((row, index) => {
    if (row.length !== headers.length)
      throw new Error(`Row ${index + 2}: incorrect number of cells.`);
    const cells = Object.fromEntries(normalized.map((h, i) => [h, row[i]?.trim() || '']));
    const product = amazonProduct(cells['product url']);
    if (!product) throw new Error(`Row ${index + 2}: use an Amazon.com item URL with an ASIN.`);
    if (seen.has(product.asin)) throw new Error(`Duplicate Amazon item: ${product.asin}.`);
    seen.add(product.asin);
    if (!cells.name || cells.name.length > 500)
      throw new Error(`Row ${index + 2}: item name must be 1–500 characters.`);
    const image = amazonImage(cells['image url']);
    if (cells['image url'] && !image) throw new Error(`Row ${index + 2}: unsupported image URL.`);
    const quantity = (key: string, fallback: number) => {
      const value = cells[key] ? Number(cells[key]) : fallback;
      if (!Number.isInteger(value) || value < 0 || value > 10000)
        throw new Error(`Row ${index + 2}: invalid ${key} quantity.`);
      return value;
    };
    const priority = cells.priority?.toLowerCase() || 'medium';
    if (!['high', 'medium', 'low'].includes(priority))
      throw new Error(`Row ${index + 2}: invalid priority.`);
    return {
      asin: product.asin,
      title: cells.name,
      productUrl: product.url,
      sourceImageUrl: image,
      description: cells.comment || '',
      priority: priority as WishCsvRow['priority'],
      requestedQuantity: Math.max(1, quantity('needs', 1)),
      receivedQuantity: quantity('has', 0),
      referencePrice: (cells.price || '').slice(0, 100),
    };
  });
}
export function wishlistDraft(row: WishCsvRow, current?: ReviewWish) {
  if (current && catalogSource(current as import('./catalog').CatalogFields) !== 'amazon')
    throw new Error('Only Curated Finds can be updated by this importer.');
  const id = current ? wishIdentity(current._id) : `amazon-find-${row.asin.toLowerCase()}`;
  const { _id, _rev, _createdAt, _updatedAt, sourceSnapshot, ...existing } =
    current || ({} as ReviewWish);
  void _id;
  void _rev;
  void _createdAt;
  void _updatedAt;
  void sourceSnapshot;
  return {
    ...existing,
    _id: `drafts.${id}`,
    _type: 'product',
    amazonAsin: row.asin,
    ...(!current
      ? {
          shoppingSection: 'finds',
          catalogSource: 'amazon',
          displayPlacements: ['finds', 'reviewWishlist'],
          reviewProgress: row.receivedQuantity >= row.requestedQuantity ? 'received' : 'wanted',
          curatedReviewStatus: 'not_reviewed',
          dataSource: 'import',
          importSource: 'amazon-wishlist-csv',
          externalListingId: row.asin,
          onReviewWishlist: true,
          retailer: 'Amazon',
          personallyTried: false,
          experienceStatus: 'curated',
          contentReviewStatus: 'needs_review',
          indexingIntent: 'index',
          affiliateLink: false,
          availability: 'unknown',
          title: row.title,
          slug: { _type: 'slug', current: row.asin.toLowerCase() },
          description: '',
          ...(row.sourceImageUrl ? { importedImageUrl: row.sourceImageUrl } : {}),
          referencePrice: row.referencePrice,
          priority: row.priority,
          requestedQuantity: row.requestedQuantity,
          receivedQuantity: row.receivedQuantity,
        }
      : {}),
    ...((current?.importOverrides as string[] | undefined)?.includes('purchaseUrl')
      ? {}
      : { purchaseUrl: row.productUrl }),
    lastImportedAt: new Date().toISOString(),
    importedFacts: { title: row.title, fingerprint: JSON.stringify(row) },
  };
}
