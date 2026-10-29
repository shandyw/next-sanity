import { z } from 'zod';
export const cents = z.number().int().min(0).max(100_000_000);
export const currencySchema = z.enum([
  'USD',
  'GBP',
  'EUR',
  'CAD',
  'AUD',
  'PLN',
  'CZK',
  'SEK',
  'DKK',
]);
export const comparableSchema = z
  .object({
    id: z.string().min(1).max(100),
    source: z.string().min(1).max(100),
    url: z
      .string()
      .max(1000)
      .refine(
        (v) =>
          !v ||
          (() => {
            try {
              const u = new URL(v);
              return u.protocol === 'https:' && !u.username && !u.password;
            } catch {
              return false;
            }
          })(),
      ),
    description: z.string().min(1).max(1500),
    brandModel: z.string().max(200),
    size: z.string().max(100),
    condition: z.string().max(200),
    priceCents: cents,
    currency: currencySchema,
    kind: z.enum(['asking', 'confirmedSold']),
    shippingCents: cents.nullable(),
    observedAt: z.iso.date(),
    soldAt: z.union([z.iso.date(), z.literal('')]),
    differences: z.string().max(2000),
    relevant: z.boolean(),
  })
  .strict();
export const pricingInputsSchema = z
  .object({
    acquisitionCents: cents.nullable(),
    cleaningCents: cents,
    packagingCents: cents,
    shippingCents: cents,
    promotionCents: cents,
    overheadCents: cents,
    desiredProfitCents: cents,
    sellerFeeBps: z.number().int().min(0).max(9999),
    fixedFeeCents: cents,
    channel: z.string().min(1).max(100),
    feeNotes: z.string().max(1000),
    ownership: z.enum(['personal', 'resale']),
    preference: z.enum(['quick', 'balanced', 'wait']),
    comparables: z.array(comparableSchema).max(30),
  })
  .strict()
  .refine(
    (v) => new Set(v.comparables.map((c) => c.id)).size === v.comparables.length,
    'Comparable IDs must be unique',
  );
export type PricingInputs = z.infer<typeof pricingInputsSchema>;
export type Comparable = z.infer<typeof comparableSchema>;
export const assessmentSchema = z
  .object({
    lowCents: cents.nullable(),
    highCents: cents.nullable(),
    listingCents: cents.nullable(),
    quickCents: cents.nullable(),
    features: z.array(z.string().max(500)).max(15),
    warnings: z.array(z.string().max(500)).max(15),
    explanation: z.string().max(4000),
    evidence: z
      .array(
        z.object({ id: z.string(), relevant: z.boolean(), reason: z.string().max(1000) }).strict(),
      )
      .max(30),
  })
  .strict();
export type Assessment = z.infer<typeof assessmentSchema>;
export const requestSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('analyze'),
      requestId: z.uuid(),
      expectedRevision: z.string().min(1),
      inputs: pricingInputsSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal('apply'),
      requestId: z.uuid(),
      analysisId: z.string().regex(/^pricing-analysis-[a-f0-9]{64}$/),
      expectedRevision: z.string().min(1),
      chosenCents: cents,
      inputs: pricingInputsSchema,
      reviewedOutdated: z.boolean(),
      approved: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal('sale'),
      requestId: z.uuid(),
      saleCents: cents,
      soldAt: z.iso.date(),
      listedAt: z.union([z.iso.date(), z.literal('')]),
      acquisitionCents: cents.nullable(),
      expensesCents: cents.nullable(),
    })
    .strict(),
]);
export const defaultInputs: PricingInputs = {
  acquisitionCents: null,
  cleaningCents: 0,
  packagingCents: 0,
  shippingCents: 0,
  promotionCents: 0,
  overheadCents: 0,
  desiredProfitCents: 0,
  sellerFeeBps: 0,
  fixedFeeCents: 0,
  channel: 'Vinted',
  feeNotes: 'Confirm current seller fees for your country. Buyer-paid fees are excluded.',
  ownership: 'personal',
  preference: 'balanced',
  comparables: [],
};
export function defaultItemPricingInputs(): PricingInputs {
  return { ...defaultInputs };
}
export interface PricingItem {
  _id: string;
  _rev: string;
  _type: 'product';
  title?: string;
  sku?: string;
  description?: string;
  shoppingSection?: string;
  affiliateLink?: boolean;
  availability?: string;
  saleStatus?: string;
  listingPrice?: number;
  currency?: string;
  brandName?: string;
  categories?: string[];
  size?: string;
  condition?: string;
  styleModel?: string;
  wearNotes?: string;
  imageUrls?: string[];
  vintedUrl?: string;
  purchaseUrl?: string;
}
export interface AnalysisRecord {
  _id: string;
  productId: string;
  product: PricingItem;
  inputs: PricingInputs;
  assessment: Assessment;
  confidence: 'limited' | 'moderate' | 'strong';
  analyzedAt: string;
  provider: string;
  model: string;
  fingerprint: string;
}
export interface SaleRecord {
  _id: string;
  productId: string;
  product: PricingItem;
  saleCents: number;
  soldAt: string;
  listedAt: string;
  acquisitionCents: number | null;
  expensesCents: number | null;
  netCents: number | null;
  profitCents: number | null;
}
export interface ApprovalRecord {
  currency: string;
  _id: string;
  productId: string;
  analysisId: string;
  chosenCents: number;
  approvedAt: string;
  state: 'pending' | 'applied' | 'failed';
  message?: string;
}
export interface PricingData {
  item: PricingItem;
  inputs: PricingInputs;
  latest: AnalysisRecord | null;
  history: AnalysisRecord[];
  approvals: ApprovalRecord[];
  sales: SaleRecord[];
  ownSales: SaleRecord[];
  nextCursor: string | null;
  aiReady: boolean;
  userId: string;
}
