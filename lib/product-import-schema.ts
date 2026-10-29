import { z } from 'zod';
import { vintedUrl } from './urls';
const listingFields = {
  externalListingId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  title: z.string().trim().min(1).max(160),
  description: z.string().max(5000).optional(),
  size: z.string().max(60).optional(),
  condition: z
    .enum(['New with tags', 'New without tags', 'Very good', 'Good', 'Satisfactory'])
    .optional(),
  listingPrice: z.number().finite().nonnegative(),
  currency: z.literal('USD').default('USD'),
  availability: z.enum(['available', 'reserved', 'sold', 'unknown']),
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
};
export const importRecordSchema = z
  .object({
    ...listingFields,
    closetPlatform: z.literal('vinted').optional(),
    vintedUrl: z
      .string()
      .refine((value) => Boolean(vintedUrl(value)), 'Use an HTTPS Vinted item URL'),
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
