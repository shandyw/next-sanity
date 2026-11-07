import { createClient } from '@sanity/client';
import { selectFashionModel, type AiFashionModel } from '../../../../lib/ai-fashion-models';
import { requestOpenAiFashionImages } from '../../../../lib/ai-generation-provider';
import {
  approvedEditorialEntry,
  buildFashionPrompt,
  imageDigest,
  isAllowedImageEditor,
  findAuthorizedProductReference,
  signPayload,
  validateGenerationInput,
  verifyPayload,
  type ApprovalTicket,
  type GenerationSession,
  type AuthorizedProductImage,
} from '../../../../lib/ai-generation';

export const runtime = 'nodejs';
export const maxDuration = 120;

type FindDocument = {
  _id: string;
  _type: 'find';
  title?: string;
  description?: string;
  category?: { _ref?: string };
  productImages?: AuthorizedProductImage[];
  editorialImages?: unknown[];
};

const noStore = { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' };
const attempts = new Map<string, { count: number; resets: number }>();
const allowedModels = new Set(['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst']);

function fail(message: string, status: number, retryAfter?: string) {
  return Response.json(
    { error: message },
    { status, headers: { ...noStore, ...(retryAfter ? { 'Retry-After': retryAfter } : {}) } },
  );
}

function limit(userId: string) {
  const now = Date.now();
  const previous = attempts.get(userId);
  const current =
    !previous || previous.resets < now ? { count: 0, resets: now + 3_600_000 } : previous;
  if (current.count >= 5) return Math.ceil((current.resets - now) / 1000);
  current.count++;
  attempts.set(userId, current);
  return 0;
}

function requireConfig() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  const secret = process.env.AI_IMAGE_SIGNING_SECRET;
  const editors = process.env.AI_IMAGE_EDITOR_IDS?.split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare';
  if (
    !projectId ||
    !dataset ||
    !secret ||
    secret.length < 32 ||
    !editors?.length ||
    !allowedModels.has(model)
  )
    throw new Error('Image generation is not configured.');
  return { projectId, dataset, secret, editors, model };
}

async function assetUrl(client: ReturnType<typeof createClient>, assetId: string) {
  const asset = await client.getDocument<{ url?: string; mimeType?: string; size?: number }>(
    assetId,
  );
  if (
    !asset?.url?.startsWith('https://cdn.sanity.io/images/') ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType || '') ||
    (asset.size || 0) > 15_000_000
  )
    throw new Error('A reference image is unavailable or too large.');
  return asset.url;
}

async function loadContext(client: ReturnType<typeof createClient>, session: GenerationSession) {
  const [find, model] = await Promise.all([
    client
      .getDocument<FindDocument>(`drafts.${session.findId}`)
      .then(async (draft) => draft || client.getDocument<FindDocument>(session.findId)),
    client.getDocument<AiFashionModel>(session.modelId),
  ]);
  if (!find || find._type !== 'find' || !find.title?.trim())
    throw new Error('Find no longer exists or has no title.');
  const choice = selectFashionModel(model ? [model] : [], { modelId: session.modelId });
  if (!choice.ok) throw new Error('The selected fashion model is no longer eligible.');
  const product = findAuthorizedProductReference(find.productImages, session.productImageKey);
  if (session.modelAssetId && session.modelAssetId !== choice.model.referenceImage.asset._ref)
    throw new Error('The model reference changed. Start a new session.');
  if (session.productAssetId && session.productAssetId !== product.assetId)
    throw new Error('The product reference changed. Start a new session.');
  if (session.productRights && session.productRights !== product.rights)
    throw new Error('The product-reference rights changed. Start a new session.');
  const [modelUrl, productUrl] = await Promise.all([
    assetUrl(client, choice.model.referenceImage.asset._ref),
    assetUrl(client, product.assetId),
  ]);
  const category = find.category?._ref
    ? await client.getDocument<{ title?: string }>(find.category._ref)
    : null;
  return { find, model: choice.model, product, modelUrl, productUrl, category: category?.title };
}

export async function POST(request: Request) {
  try {
    const config = requireConfig();
    const origin = request.headers.get('origin');
    if (origin !== new URL(request.url).origin) return fail('Forbidden origin.', 403);
    const token = request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
    if (!token) return fail('Sign in to Sanity Studio first.', 401);
    const client = createClient({
      projectId: config.projectId,
      dataset: config.dataset,
      apiVersion: '2026-10-01',
      useCdn: false,
      token,
      perspective: 'raw',
    });
    const user = await client.users.getById('me');
    if (!isAllowedImageEditor(user?.id, config.editors))
      return fail('Editor is not authorized for image generation.', 403);
    if (Number(request.headers.get('content-length') || 0) > 8_000_000)
      return fail('Request too large.', 413);
    const body = await request.json();
    if (!body || typeof body !== 'object') return fail('Invalid request.', 400);

    if (body.action === 'generate') {
      if (!process.env.OPENAI_API_KEY) return fail('Image provider is not configured.', 503);
      const retrySeconds = limit(user.id);
      if (retrySeconds)
        return fail('Hourly generation limit reached. Try again later.', 429, String(retrySeconds));
      let session: GenerationSession;
      if (body.sessionToken) {
        session = verifyPayload<GenerationSession>(body.sessionToken, config.secret);
        if (session.userId !== user.id) return fail('Session belongs to another editor.', 403);
      } else {
        const input = validateGenerationInput(body);
        const models = await client.fetch<AiFashionModel[]>(
          '*[_type == "aiFashionModel" && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && active == true]{_id,name,active,clothingSize,bodyShape,measurements,appearance,identityPrompt,referenceImage,referenceImageAlt,referenceImageSource,referenceImageRights,referenceImageApproval}',
        );
        const selected = selectFashionModel(models, { modelId: input.modelId });
        if (!selected.ok)
          return fail(
            selected.reason === 'empty'
              ? 'No approved active fashion models are available.'
              : 'The chosen fashion model is unavailable.',
            400,
          );
        session = {
          userId: user.id,
          findId: input.findId,
          modelId: selected.model._id,
          productImageKey: input.productImageKey,
          styling: input.styling,
          count: input.count,
          expiresAt: Date.now() + 30 * 60_000,
        };
      }
      const context = await loadContext(client, session);
      session.modelAssetId = context.model.referenceImage.asset._ref;
      session.productAssetId = context.product.assetId;
      session.productRights = context.product.rights;
      const prompt = buildFashionPrompt({
        model: context.model,
        productTitle: context.find.title!,
        category: context.category,
        productDescription: context.find.description,
        styling: session.styling,
      });
      const result = await requestOpenAiFashionImages({
        apiKey: process.env.OPENAI_API_KEY,
        model: config.model,
        modelImageUrl: context.modelUrl,
        productImageUrl: context.productUrl,
        prompt,
        count: session.count,
        editorId: user.id,
        signal: AbortSignal.timeout(100_000),
      });
      if (!result.ok)
        return fail(
          result.status === 429
            ? 'Image provider is rate-limiting requests. Try again later.'
            : result.status === 503
              ? 'Image provider is temporarily unavailable.'
              : 'Image provider rejected this request. Review the references and prompt.',
          result.status,
          result.retryAfter,
        );
      if (result.images.reduce((bytes, image) => bytes + image.length, 0) > 4_000_000)
        return fail(
          'Generated previews exceeded the private response size limit. Try one variation.',
          502,
        );
      const previews = result.images.map((b64_json) => {
        if (!b64_json || b64_json.length > 8_000_000)
          throw new Error('Image provider returned an invalid image.');
        const bytes = Buffer.from(b64_json, 'base64');
        if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.length > 6_000_000)
          throw new Error('Image provider returned an invalid JPEG.');
        const ticket: ApprovalTicket = {
          session,
          digest: imageDigest(bytes),
          generatedAt: new Date().toISOString(),
          providerModel: config.model,
          expiresAt: session.expiresAt,
          prompt,
        };
        return {
          dataUrl: `data:image/jpeg;base64,${b64_json}`,
          ticket: signPayload(ticket, config.secret),
        };
      });
      return Response.json(
        {
          sessionToken: signPayload(session, config.secret),
          modelId: session.modelId,
          modelName: context.model.name,
          previews,
        },
        { headers: noStore },
      );
    }

    if (body.action === 'approve') {
      if (
        typeof body.ticket !== 'string' ||
        typeof body.imageBase64 !== 'string' ||
        typeof body.alt !== 'string' ||
        body.alt.trim().length < 10 ||
        body.alt.length > 240
      )
        return fail('Provide a valid image and description.', 400);
      const ticket = verifyPayload<ApprovalTicket>(body.ticket, config.secret);
      if (ticket.session.userId !== user.id || ticket.session.expiresAt < Date.now())
        return fail('Approval session expired or belongs to another editor.', 403);
      if (body.imageBase64.length > 8_000_000) return fail('Image too large.', 413);
      const bytes = Buffer.from(body.imageBase64, 'base64');
      if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || imageDigest(bytes) !== ticket.digest)
        return fail('Preview image did not match the generated result.', 400);
      const context = await loadContext(client, ticket.session);
      const existing = await client.getDocument<{
        editorialImages?: { generationDigest?: string }[];
      }>(`drafts.${ticket.session.findId}`);
      if (existing?.editorialImages?.some((image) => image.generationDigest === ticket.digest))
        return fail('This preview has already been approved.', 409);
      const asset = await client.assets.upload('image', bytes, {
        contentType: 'image/jpeg',
        filename: `ai-styling-${ticket.digest.slice(0, 12)}.jpg`,
      });
      const draftId = `drafts.${ticket.session.findId}`;
      if (context.find._id !== draftId) {
        const {
          _id: unusedId,
          _rev: unusedRev,
          _createdAt: unusedCreated,
          _updatedAt: unusedUpdated,
          ...published
        } = context.find as FindDocument & {
          _rev?: string;
          _createdAt?: string;
          _updatedAt?: string;
        };
        void unusedId;
        void unusedRev;
        void unusedCreated;
        void unusedUpdated;
        await client.createIfNotExists({ ...published, _id: draftId, _type: 'find' });
      }
      const entry = approvedEditorialEntry({
        assetId: asset._id,
        alt: body.alt,
        ticket,
        prompt: ticket.prompt,
        productAssetId: context.product.assetId,
        productRights: context.product.rights,
      });
      await client
        .patch(draftId)
        .setIfMissing({ editorialImages: [] })
        .append('editorialImages', [entry])
        .commit();
      return Response.json({ status: 'approved', assetId: asset._id }, { headers: noStore });
    }
    return fail('Unknown action.', 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.';
    if (message === 'Image generation is not configured.') return fail(message, 503);
    if (
      (error instanceof DOMException && ['AbortError', 'TimeoutError'].includes(error.name)) ||
      message.toLowerCase().includes('timeout')
    )
      return fail('Image generation timed out. You can retry with the same model.', 504);
    if (message.includes('Unauthorized') || message.includes('Insufficient permissions'))
      return fail('Sanity editor permission denied.', 403);
    if (
      /^(Invalid|Choose|Enter|Save|Select|The |No |Image |Find |A reference|This generation)/.test(
        message,
      )
    )
      return fail(message, 400);
    return fail('Image workflow failed. Check your connection and try again.', 503);
  }
}
