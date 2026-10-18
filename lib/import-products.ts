import { createHash } from 'node:crypto';
import { vintedUrl, poshmarkUrl } from './urls';
import { type ImportRecord } from './product-import-schema';
export { importRecordSchema, importEnvelopeSchema } from './product-import-schema';
export type { ImportRecord } from './product-import-schema';
export interface ExistingProduct {
  _id: string;
  _rev: string;
  dataSource?: string;
  importSource?: string;
  externalListingId?: string;
  importEnabled?: boolean;
  shoppingSection?: string;
  closetPlatform?: string;
  saleStatus?: string;
  lastSuccessfullyCheckedAt?: string;
}
export function stableProductId(source: string, id: string) {
  return (
    'import-product-' + createHash('sha256').update(`${source}\0${id}`).digest('hex').slice(0, 40)
  );
}
export function createProduct(source: string, r: ImportRecord) {
  const _id = stableProductId(source, r.externalListingId);
  return {
    _id,
    _type: 'product',
    dataSource: 'import',
    shoppingSection: 'closet',
    closetPlatform: r.closetPlatform || 'vinted',
    importSource: source,
    externalListingId: r.externalListingId,
    importEnabled: true,
    title: r.title,
    slug: {
      _type: 'slug',
      current: `${
        r.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 60) || 'closet-item'
      }-${_id.slice(-12)}`,
    },
    description: r.description || '',
    size: r.size || '',
    condition: r.condition || '',
    ...listingUpdate(r),
    photos: (r.photoAssetRefs || []).map((p, i) => ({
      _type: 'image',
      _key: `photo${i}`,
      alt: p.alt,
      asset: { _type: 'reference', _ref: p.assetRef },
    })),
  };
}
export function listingUpdate(r: ImportRecord, existing?: ExistingProduct) {
  return {
    listingPrice: r.listingPrice,
    currency: r.currency,
    ...(existing?.saleStatus === 'available' || existing?.saleStatus === 'sold'
      ? {}
      : { availability: r.availability }),
    ...(r.closetPlatform === 'poshmark'
      ? { poshmarkUrl: poshmarkUrl(r.poshmarkUrl)! }
      : { vintedUrl: vintedUrl(r.vintedUrl)! }),
    lastSuccessfullyCheckedAt: r.lastSuccessfullyCheckedAt,
  };
}
export function updateDecision(existing: ExistingProduct, source: string, r: ImportRecord) {
  if (existing.shoppingSection === 'finds') return 'curated item is editorially managed';
  if (
    existing.dataSource !== 'import' ||
    existing.importSource !== source ||
    existing.externalListingId !== r.externalListingId
  )
    return 'identity mismatch';
  if ((existing.closetPlatform || 'vinted') !== (r.closetPlatform || 'vinted'))
    return 'marketplace is editorially managed';
  if (!existing.importEnabled) return 'manual ownership';
  if (
    existing.lastSuccessfullyCheckedAt &&
    Date.parse(existing.lastSuccessfullyCheckedAt) >= Date.parse(r.lastSuccessfullyCheckedAt)
  )
    return 'unchanged or older snapshot';
  return 'update';
}
