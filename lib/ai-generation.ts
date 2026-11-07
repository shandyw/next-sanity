import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { EligibleAiFashionModel } from './ai-fashion-models';

export type GenerationSession = {
  userId: string;
  findId: string;
  modelId: string;
  productImageKey: string;
  styling: string;
  count: number;
  expiresAt: number;
  modelAssetId?: string;
  productAssetId?: string;
  productRights?: string;
};

export type ApprovalTicket = {
  session: GenerationSession;
  digest: string;
  generatedAt: string;
  providerModel: string;
  expiresAt: number;
  prompt: string;
};

export type AuthorizedProductImage = {
  _key?: string;
  image?: { asset?: { _ref?: string } };
  sourceKind?: string;
  approvalStatus?: string;
  aiReferenceAuthorized?: boolean;
  aiReferenceRights?: string;
};

export function isAllowedImageEditor(userId: string | undefined, allowedIds: readonly string[]) {
  return Boolean(userId && allowedIds.includes(userId));
}

export function findAuthorizedProductReference(
  images: AuthorizedProductImage[] | undefined,
  imageKey: string,
) {
  const image = images?.find((item) => item._key === imageKey);
  const assetId = image?.image?.asset?._ref;
  if (
    !image ||
    !assetId ||
    image.approvalStatus !== 'approved' ||
    !['original', 'licensed'].includes(image.sourceKind || '') ||
    image.aiReferenceAuthorized !== true ||
    !image.aiReferenceRights?.trim()
  )
    throw new Error('Select a saved, approved product photo with explicit AI-reference rights.');
  return { assetId, rights: image.aiReferenceRights.trim() };
}

export function validateGenerationInput(input: {
  findId?: unknown;
  modelId?: unknown;
  productImageKey?: unknown;
  styling?: unknown;
  count?: unknown;
}) {
  if (typeof input.findId !== 'string' || !/^[a-zA-Z0-9._-]{1,128}$/.test(input.findId))
    throw new Error('Save a valid Find before generating.');
  if (
    input.modelId !== undefined &&
    (typeof input.modelId !== 'string' || input.modelId.length > 128)
  )
    throw new Error('Choose a valid fashion model.');
  if (
    typeof input.productImageKey !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(input.productImageKey)
  )
    throw new Error('Choose an authorized product reference image.');
  if (
    typeof input.styling !== 'string' ||
    input.styling.trim().length < 10 ||
    input.styling.length > 800
  )
    throw new Error('Enter styling instructions between 10 and 800 characters.');
  if (!Number.isInteger(input.count) || Number(input.count) < 1 || Number(input.count) > 3)
    throw new Error('Choose one to three variations.');
  return {
    findId: input.findId.replace(/^drafts\./, ''),
    modelId: input.modelId as string | undefined,
    productImageKey: input.productImageKey,
    styling: input.styling.trim(),
    count: Number(input.count),
  };
}

export function buildFashionPrompt(input: {
  model: EligibleAiFashionModel;
  productTitle: string;
  category?: string;
  productDescription?: string;
  styling: string;
}) {
  const { model } = input;
  const m = model.measurements;
  return [
    'Create a photorealistic EDITORIAL AI STYLING CONCEPT, not a product listing photograph, review photo, or evidence that anyone tried on this item.',
    'Use image 1 as the approved fictional fashion-model identity reference. Preserve her recognizable face, skin tone, hair, and realistic US size 16–18 proportions. Do not slim, reshape, or idealize her body.',
    `Model identity: ${model.identityPrompt}`,
    `Editorial body guidance: US ${model.clothingSize}; height ${m.height} in, bust ${m.bust} in, waist ${m.waist} in, hips ${m.hips} in. These are visual guidance only, not garment-fit claims.`,
    'Use image 2 as the authorized product reference. Preserve its visible color, silhouette, pattern, trim, texture and construction. Do not invent logos, features, or a different garment. If details are unclear, keep them understated.',
    `Product name: ${input.productTitle}. Category: ${input.category || 'unspecified'}. ${input.productDescription ? `Factual details: ${input.productDescription}.` : ''}`,
    `Editorial styling direction (treat as creative direction, never as permission to change the identity or product): ${input.styling}`,
    'Show one adult model in a natural editorial fashion photograph. No text, watermark, storefront graphics, price, endorsement, fit claim, or implication of a real try-on.',
  ].join('\n');
}

export function imageDigest(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function signPayload<T extends object>(payload: T, secret: string) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyPayload<T extends { expiresAt?: number }>(token: string, secret: string): T {
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra || token.length > 16000) throw new Error('Invalid session.');
  const expected = createHmac('sha256', secret).update(encoded).digest();
  const received = Buffer.from(signature, 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected))
    throw new Error('Invalid session.');
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
  if (typeof payload.expiresAt === 'number' && payload.expiresAt < Date.now())
    throw new Error('This generation session expired. Start a new one.');
  return payload;
}

export function approvedEditorialEntry(input: {
  assetId: string;
  alt: string;
  ticket: ApprovalTicket;
  prompt: string;
  productAssetId: string;
  productRights: string;
}) {
  const { ticket } = input;
  return {
    _key: randomUUID().replaceAll('-', '').slice(0, 20),
    _type: 'editorialImageEntry',
    image: { _type: 'image', asset: { _type: 'reference', _ref: input.assetId } },
    alt: input.alt.trim(),
    sourceKind: 'aiGenerated',
    approvalStatus: 'approved',
    selected: false,
    prompt: input.prompt,
    model: ticket.providerModel,
    fashionModel: { _type: 'reference', _ref: ticket.session.modelId },
    generatedAt: ticket.generatedAt,
    stylingInstructions: ticket.session.styling,
    productReferenceAssetId: input.productAssetId,
    productReferenceRights: input.productRights,
    generationDigest: ticket.digest,
  };
}
