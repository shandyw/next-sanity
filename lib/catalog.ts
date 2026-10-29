import { stegaClean } from 'next-sanity';
import type { DocumentContent } from './types';
import { productPhotos, isAmazonProduct } from './amazon';
import { safeExternal, vintedUrl } from './urls';
export type CatalogSource = 'closet' | 'amazon';
export type Placement = 'closet' | 'finds' | 'reviewWishlist';
export function defaultPlacements(source: CatalogSource): Placement[] {
  return source === 'amazon' ? ['finds'] : ['closet'];
}
export interface CatalogFields {
  catalogSource?: CatalogSource;
  underlyingProduct?: { _ref?: string } | null;
  displayPlacements?: Placement[] | null;
  archived?: boolean;
  saleStatus?: string;
  availability?: string;
  shoppingSection?: string;
  onReviewWishlist?: boolean;
  reviewProgress?: 'not_requested' | 'wanted' | 'received' | 'in_progress' | 'reviewed';
  curatedReviewStatus?: 'not_reviewed' | 'reviewed';
}
export function catalogSource(d: CatalogFields): CatalogSource {
  return (
    stegaClean(d.catalogSource) || (stegaClean(d.shoppingSection) === 'finds' ? 'amazon' : 'closet')
  );
}
export function amazonFieldsVisible(d: CatalogFields): boolean {
  return catalogSource(d) === 'amazon' || Boolean(d.underlyingProduct?._ref);
}
export function catalogPlacements(d: CatalogFields): Placement[] {
  const explicit = stegaClean(d.displayPlacements);
  return Array.isArray(explicit)
    ? explicit
    : catalogSource(d) === 'closet'
      ? ['closet']
      : ['finds', ...(d.onReviewWishlist ? ['reviewWishlist' as const] : [])];
}
export function isCuratedFind(d: CatalogFields) {
  return catalogSource(d) === 'amazon' && catalogPlacements(d).includes('finds');
}
export function curatedReviewStatus(d: CatalogFields): 'not_reviewed' | 'reviewed' {
  return d.curatedReviewStatus === 'reviewed' ? 'reviewed' : 'not_reviewed';
}
export function placementError(d: CatalogFields) {
  const allowed = catalogSource(d) === 'closet' ? ['closet'] : ['finds', 'reviewWishlist'];
  return catalogPlacements(d).some((p) => !allowed.includes(p))
    ? 'Closet inventory can only appear in My Closet; Amazon products can appear in Curated Finds and My Review Wishlist.'
    : undefined;
}
export function closetStatus(d: CatalogFields) {
  // A legacy sold indicator always wins over an inconsistent available value.
  if (d.saleStatus === 'sold' || stegaClean(d.availability) === 'sold') return 'sold';
  return d.saleStatus || stegaClean(d.availability) || 'unknown';
}
export function reviewProgress(
  d: CatalogFields & { receivedQuantity?: number; requestedQuantity?: number },
) {
  return (
    d.reviewProgress ||
    ((d.receivedQuantity || 0) >= (d.requestedQuantity || 1)
      ? 'received'
      : catalogPlacements(d).includes('reviewWishlist')
        ? 'wanted'
        : 'not_requested')
  );
}
export function reviewWishlistItems(items: DocumentContent[]) {
  return items.filter(
    (d) =>
      !d.archived &&
      catalogPlacements(d).includes('reviewWishlist') &&
      !['received', 'in_progress'].includes(reviewProgress(d)) &&
      (isCuratedFind(d) ? curatedReviewStatus(d) !== 'reviewed' : reviewProgress(d) !== 'reviewed'),
  );
}
export function catalogIssues(d: DocumentContent) {
  const issues: string[] = [];
  if (!d.title?.trim()) issues.push('Add a name');
  if (!d.slug) issues.push('Add a slug');
  if (!productPhotos(d).length) issues.push('Add an approved public image');
  if (!d.categories?.length) issues.push('Choose a category');
  const incompatible = placementError(d);
  if (incompatible) issues.push(incompatible);
  if (catalogSource(d) === 'closet') {
    if (!d.sku) issues.push('Assign a SKU');
    if (!vintedUrl(d.vintedUrl || d.purchaseUrl)) issues.push('Add a marketplace listing URL');
    if (!['available', 'sold'].includes(closetStatus(d))) issues.push('Confirm availability');
  } else {
    if (!d.amazonAsin && isAmazonProduct(d)) issues.push('Confirm ASIN');
    if (!safeExternal(d.purchaseUrl)) issues.push('Add an Amazon product URL');
  }
  return issues;
}
export function acknowledgment(d: {
  readerProvided?: boolean;
  senderDisplayName?: string;
  senderNamePermission?: boolean;
  thankYouMessage?: string;
}) {
  if (!d.readerProvided) return undefined;
  if (!d.senderNamePermission)
    return 'Thank you to the reader who provided this item for an honest review.';
  const name = d.senderDisplayName?.trim();
  return (
    d.thankYouMessage?.trim() ||
    (name
      ? `Thank you, ${name}, for providing this item for an honest review.`
      : 'Thank you to the reader who provided this item for an honest review.')
  );
}
