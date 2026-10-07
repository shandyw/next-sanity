import { z } from 'zod';
import { createHash } from 'node:crypto';
import { vintedUrl } from './urls';
export const importRecordSchema = z
  .object({
    externalListingId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
    title: z.string().trim().min(1).max(160),
    description: z.string().max(5000).optional(),
    size: z.string().max(60).optional(),
    condition: z
      .enum(['New with tags', 'New without tags', 'Very good', 'Good', 'Satisfactory'])
      .optional(),
    listingPrice: z.number().finite().nonnegative(),
    currency: z.enum(['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'PLN', 'CZK', 'SEK', 'DKK']),
    availability: z.enum(['available', 'reserved', 'sold', 'unknown']),
    vintedUrl: z.string().refine((v) => Boolean(vintedUrl(v)), 'Use an HTTPS Vinted item URL'),
    lastSuccessfullyCheckedAt: z.iso
      .datetime({ offset: true })
      .refine((v) => Date.parse(v) <= Date.now(), 'Check timestamps cannot be in the future'),
    photoAssetRefs: z
      .array(
        z.object({
          assetRef: z.string().regex(/^image-[a-f0-9]+-\d+x\d+-(jpg|png|webp|gif|avif)$/),
          alt: z.string().min(1).max(500),
        }),
      )
      .max(20)
      .optional(),
  })
  .strict();
export const importEnvelopeSchema = z
  .object({
    version: z.literal(1),
    source: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
    products: z.array(z.unknown()).max(10000),
  })
  .strict();
export type ImportRecord = z.infer<typeof importRecordSchema>;
export interface ExistingProduct {
  _id: string;
  _rev: string;
  dataSource?: string;
  importSource?: string;
  externalListingId?: string;
  importEnabled?: boolean;
  shoppingSection?: string;
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
export function listingUpdate(r: ImportRecord) {
  return {
    listingPrice: r.listingPrice,
    currency: r.currency,
    availability: r.availability,
    vintedUrl: vintedUrl(r.vintedUrl)!,
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
  if (!existing.importEnabled) return 'manual ownership';
  if (
    existing.lastSuccessfullyCheckedAt &&
    Date.parse(existing.lastSuccessfullyCheckedAt) >= Date.parse(r.lastSuccessfullyCheckedAt)
  )
    return 'unchanged or older snapshot';
  return 'update';
}
