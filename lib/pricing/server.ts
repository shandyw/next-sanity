import 'server-only';
import { createClient, type SanityClient } from '@sanity/client';
import { createHash } from 'node:crypto';
import { INVENTORY_API_VERSION, publishedId } from '@/sanity/inventory/model';
import {
  currencySchema,
  defaultItemPricingInputs,
  requestSchema,
  type PricingItem,
  type AnalysisRecord,
  type SaleRecord,
  type ApprovalRecord,
} from './contracts';
import { checkedAssessment, eligibleItem, itemAvailable, itemSold } from './engine';
import {
  bearerToken,
  requirePricingAdmin,
  requirePrivateDataset,
  limitedRequestText,
  PricingError,
} from './security';
import { assessItem } from './provider';
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function pricingFingerprint(item: PricingItem, inputs: unknown) {
  const { _rev: revision, _id: id, ...details } = item;
  void revision;
  void id;
  return hash({ details, inputs });
}
async function authenticate(request: Request) {
  const token = bearerToken(request);
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  if (!projectId || !dataset)
    throw new PricingError(503, 'Configure the existing Sanity project and dataset.');
  const client = createClient({
    projectId,
    dataset,
    token,
    apiVersion: INVENTORY_API_VERSION,
    useCdn: false,
    perspective: 'raw',
    timeout: 15000,
  });
  let user;
  try {
    user = await client.users.getById('me');
  } catch {
    throw new PricingError(401, 'Your Studio session could not be verified. Sign in again.');
  }
  requirePricingAdmin(user.id, process.env.PRICING_ADMIN_USER_IDS || '');
  const datasets = await client.datasets.list();
  requirePrivateDataset(process.env.SANITY_PRICING_DATASET, dataset, datasets);
  const privateClient = client.withConfig({ dataset: process.env.SANITY_PRICING_DATASET });
  // Force private-dataset authorization on every endpoint before accessing products or calling AI.
  await privateClient.fetch('count(*[_type == "pricingAnalysis"])');
  return { client, privateClient, userId: user.id, projectId, dataset };
}
async function product(client: SanityClient, id: string) {
  const pair = await client.fetch<PricingItem[]>(
    `*[_type=='product' && _id in $ids]{_id,_rev,_type,title,sku,description,shoppingSection,affiliateLink,availability,saleStatus,listingPrice,currency,"brandName":brand->title,"categories":categories[]->title,size,condition,styleModel,wearNotes,vintedUrl,purchaseUrl,"imageUrls":(coalesce(photos,[]) + coalesce(labelDefectPhotos,[]))[].asset->url}`,
    { ids: [id, `drafts.${id}`] },
  );
  const item = pair.find((p) => p._id === `drafts.${id}`) || pair.find((p) => p._id === id);
  if (!item) throw new PricingError(404, 'Shopping item not found. Save the item in Studio first.');
  if (!eligibleItem(item))
    throw new PricingError(
      403,
      'Pricing is only available for My Closet items without an affiliate purchase listing.',
    );
  item.currency ??= 'USD';
  if (!currencySchema.safeParse(item.currency).success)
    throw new PricingError(400, 'This item has an unsupported saved listing currency.');
  const conf = client.config();
  item.imageUrls = (item.imageUrls || []).filter((url) => {
    try {
      const u = new URL(url);
      return (
        u.protocol === 'https:' &&
        u.hostname === 'cdn.sanity.io' &&
        u.pathname.startsWith(`/images/${conf.projectId}/${conf.dataset}/`) &&
        !u.search &&
        !u.username &&
        !u.password
      );
    } catch {
      return false;
    }
  });
  if (item.imageUrls.length > 8) item.imageUrls = item.imageUrls.slice(0, 8);
  return item;
}
async function withLock<T>(client: SanityClient, id: string, fn: () => Promise<T>) {
  const lockId = `pricing-lock-${hash(id)}`;
  const existing = await client.getDocument<{ _id: string; _rev: string; expiresAt: string }>(
    lockId,
  );
  if (existing) {
    if (Date.parse(existing.expiresAt) > Date.now())
      throw new PricingError(409, 'A pricing operation is already pending. Please wait.');
    await client
      .transaction()
      .patch(lockId, { ifRevisionID: existing._rev, setIfMissing: { _type: 'pricingLock' } })
      .delete(lockId)
      .commit();
  }
  let lock;
  try {
    lock = await client.create({
      _id: lockId,
      _type: 'pricingLock',
      expiresAt: new Date(Date.now() + 120000).toISOString(),
    });
  } catch {
    throw new PricingError(409, 'Another pricing operation started. Please wait and retry.');
  }
  try {
    return await fn();
  } finally {
    try {
      await client
        .transaction()
        .patch(lockId, { ifRevisionID: lock._rev, setIfMissing: { _type: 'pricingLock' } })
        .delete(lockId)
        .commit();
    } catch {
      /* Expiry permits recovery; never delete another operation's lock. */
    }
  }
}
async function loadPage<T>(client: SanityClient, type: string, id: string, cursor: string) {
  return client.fetch<T[]>(
    `*[_type==$type && productId==$id && status!='pending' && (!defined(status) || status=='completed') && _id>$cursor] | order(_id asc)[0...21]`,
    { type, id, cursor },
  );
}
export async function handlePricing(request: Request, rawId: string) {
  try {
    const id = publishedId(rawId);
    if (
      !/^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,199}$/.test(id) ||
      id.startsWith('versions.') ||
      id.startsWith('drafts.')
    )
      throw new PricingError(400, 'Invalid Shopping item ID.');
    const { client, privateClient, userId } = await authenticate(request);
    const item = await product(client, id);
    if (request.method === 'GET') {
      const cursor = new URL(request.url).searchParams.get('cursor') || '';
      if (cursor.length > 200) throw new PricingError(400, 'Invalid history cursor.');
      const history = await loadPage<AnalysisRecord>(privateClient, 'pricingAnalysis', id, cursor);
      const [latest, sales, approvals, ownSales] = await Promise.all([
        privateClient.fetch<AnalysisRecord[]>(
          `*[_type=='pricingAnalysis' && productId==$id && status=='completed'] | order(analyzedAt desc)[0...1]`,
          { id },
        ),
        privateClient.fetch<SaleRecord[]>(
          `*[_type=='pricingSale' && productId==$id] | order(soldAt desc)`,
          { id },
        ),
        privateClient.fetch<ApprovalRecord[]>(
          `*[_type=='pricingApproval' && productId==$id] | order(approvedAt desc)`,
          { id },
        ),
        privateClient.fetch<SaleRecord[]>(`*[_type=='pricingSale'] | order(soldAt desc)[0...50]`),
      ]);
      return reply({
        item,
        inputs:
          latest[0]?.product.currency === item.currency
            ? latest[0].inputs
            : defaultItemPricingInputs(),
        latest: latest[0] || null,
        history: history.slice(0, 20),
        nextCursor: history.length > 20 ? history[19]._id : null,
        sales,
        approvals,
        ownSales,
        aiReady: Boolean(process.env.OPENAI_API_KEY && process.env.PRICING_AI_MODEL),
        userId,
      });
    }
    const text = await limitedRequestText(request);
    const body = requestSchema.parse(JSON.parse(text));
    if (body.action !== 'sale')
      for (const comparable of body.inputs.comparables) {
        if (!comparable.id.startsWith('own-sale:')) continue;
        const recorded = await privateClient.getDocument<SaleRecord>(comparable.id.slice(9));
        if (
          !recorded ||
          recorded.saleCents !== comparable.priceCents ||
          recorded.product.currency !== comparable.currency ||
          recorded.soldAt !== comparable.soldAt ||
          comparable.kind !== 'confirmedSold'
        )
          throw new PricingError(
            400,
            'Own-sale comparable must match its actual private sale record. Add a manual comparable for edited evidence.',
          );
      }
    if (
      body.action !== 'sale' &&
      body.inputs.comparables.some(
        (c) =>
          Date.parse(c.observedAt) > Date.now() || (c.soldAt && Date.parse(c.soldAt) > Date.now()),
      )
    )
      throw new PricingError(400, 'Comparable dates cannot be in the future.');
    const operate = () =>
      withLock(privateClient, id, async () => {
        if (body.action === 'analyze') {
          const recordId = `pricing-analysis-${hash([id, userId, body.requestId])}`;
          const existing = await privateClient.getDocument<Record<string, unknown>>(recordId);
          if (existing) {
            if (
              existing.status === 'completed' &&
              existing.fingerprint === pricingFingerprint(item, body.inputs)
            )
              return reply(existing);
            throw new PricingError(
              409,
              'This analysis request was already submitted. Reload history or start a new analysis.',
            );
          }
          if (item._rev !== body.expectedRevision)
            throw new PricingError(409, 'The item changed. Reload details before analysis.');
          if (!process.env.OPENAI_API_KEY || !process.env.PRICING_AI_MODEL)
            throw new PricingError(
              503,
              'AI setup required: configure OPENAI_API_KEY and PRICING_AI_MODEL.',
            );
          const recent = await privateClient.fetch<number>(
            `count(*[_type=='pricingAnalysis' && actor==$actor && _createdAt>$since])`,
            { actor: userId, since: new Date(Date.now() - 600000).toISOString() },
          );
          if (recent >= 5)
            throw new PricingError(
              429,
              'Five analyses per ten minutes are allowed. Please wait before trying again.',
            );
          const snapshot = {
            productId: id,
            product: item,
            inputs: body.inputs,
            fingerprint: pricingFingerprint(item, body.inputs),
            actor: userId,
          };
          await privateClient.create({
            _id: recordId,
            _type: 'pricingAnalysis',
            status: 'pending',
            ...snapshot,
          });
          try {
            const result = await assessItem(item, body.inputs);
            const checked = checkedAssessment(result.assessment, body.inputs, item.currency!);
            const fields = {
              ...result,
              ...checked,
              status: 'completed',
              analyzedAt: new Date().toISOString(),
            };
            const record = await privateClient.patch(recordId).set(fields).commit();
            return reply(record);
          } catch (error) {
            await privateClient
              .patch(recordId)
              .set({
                status: 'failed',
                failureMessage:
                  error instanceof PricingError
                    ? error.message
                    : 'The assessment failed validation. No asking price was changed.',
              })
              .commit();
            throw error;
          }
        }
        if (body.action === 'sale') {
          if (!itemSold(item))
            throw new PricingError(
              409,
              'Mark the item Sold through the existing workflow before recording actual sale results.',
            );
          if (
            Date.parse(body.soldAt) > Date.now() ||
            (body.listedAt && body.listedAt > body.soldAt)
          )
            throw new PricingError(400, 'Check sale and listing dates.');
          const saleId = `pricing-sale-${hash([id, userId, body.requestId])}`;
          const previous = await privateClient.getDocument(saleId);
          if (previous) return reply(previous);
          const netCents = body.expensesCents === null ? null : body.saleCents - body.expensesCents;
          const record = await privateClient.create({
            _id: saleId,
            _type: 'pricingSale',
            productId: id,
            product: item,
            actor: userId,
            ...body,
            netCents,
            profitCents:
              netCents === null || body.acquisitionCents === null
                ? null
                : netCents - body.acquisitionCents,
            recordedAt: new Date().toISOString(),
          });
          return reply(record);
        }
        if (!itemAvailable(item))
          throw new PricingError(
            409,
            'Return the item to Available through the existing workflow before applying a price.',
          );
        if (item._rev !== body.expectedRevision)
          throw new PricingError(409, 'The item changed. Reload and review before applying.');
        const analysis = await privateClient.getDocument<AnalysisRecord & { status: string }>(
          body.analysisId,
        );
        if (!analysis || analysis.productId !== id || analysis.status !== 'completed')
          throw new PricingError(400, 'Choose a completed analysis for this item.');
        if (analysis.product.currency !== item.currency)
          throw new PricingError(
            409,
            'Item currency changed. Regenerate the assessment and re-enter costs in the new currency; no conversion is performed.',
          );
        const outdated = analysis.fingerprint !== pricingFingerprint(item, body.inputs);
        if (outdated && !body.reviewedOutdated)
          throw new PricingError(
            409,
            'Recommendation is outdated. Regenerate or explicitly review the changed inputs.',
          );
        const approvalId = `pricing-approval-${hash([id, userId, body.requestId])}`;
        const previous = await privateClient.getDocument<ApprovalRecord>(approvalId);
        if (previous) {
          if (previous.state === 'applied') return reply(previous);
          throw new PricingError(
            409,
            'This approval was already submitted. Review its audit state before retrying.',
          );
        }
        const approval = await privateClient.create({
          _id: approvalId,
          _type: 'pricingApproval',
          productId: id,
          analysisId: body.analysisId,
          actor: userId,
          state: 'pending',
          chosenCents: body.chosenCents,
          currency: item.currency,
          approvedAt: new Date().toISOString(),
          reviewedOutdated: body.reviewedOutdated,
          inputSnapshot: body.inputs,
          productSnapshot: item,
        });
        let committed = false;
        try {
          const source = await client.getDocument<Record<string, unknown>>(item._id);
          if (!source || source._rev !== body.expectedRevision)
            throw new PricingError(409, 'Concurrent edit detected. Reload the item.');
          const fields = { listingPrice: body.chosenCents / 100, currency: item.currency! };
          let result;
          if (item._id.startsWith('drafts.'))
            result = await client.patch(item._id).ifRevisionId(item._rev).set(fields).commit();
          else {
            const copy = { ...source };
            for (const key of ['_rev', '_createdAt', '_updatedAt']) delete copy[key];
            // Revision assertion on the source is a no-op: _type already exists.
            result = await client
              .transaction()
              .patch(id, { ifRevisionID: item._rev, setIfMissing: { _type: 'product' } })
              .create({ ...copy, _id: `drafts.${id}`, _type: 'product', ...fields })
              .commit();
          }
          void result;
          committed = true;
          await privateClient
            .patch(approvalId)
            .ifRevisionId(approval._rev)
            .set({ state: 'applied' })
            .commit();
          return reply({
            message:
              'Price saved to draft. Review and publish in Studio. Update the marketplace listing manually; this does not change its listing.',
            approvalId,
          });
        } catch (error) {
          if (committed)
            throw new PricingError(
              409,
              'Draft price was saved, but audit finalization failed. Refresh the draft and history; do not blindly retry this approval.',
            );
          await privateClient
            .patch(approvalId)
            .set({
              state: 'failed',
              message: 'Draft update failed; check the item before a new approval.',
            })
            .commit();
          throw error;
        }
      });
    return body.action === 'analyze'
      ? await withLock(privateClient, `admin:${userId}`, operate)
      : await operate();
  } catch (error) {
    if (error instanceof PricingError) return reply({ message: error.message }, error.status);
    if (error instanceof SyntaxError || (error && typeof error === 'object' && 'issues' in error))
      return reply(
        {
          message:
            'Check required fields, currency, monetary inputs, fees and comparable evidence.',
        },
        400,
      );
    const status = (error as { statusCode?: number })?.statusCode;
    return reply(
      {
        message:
          status === 403
            ? 'Your Sanity account does not have the required dataset permissions.'
            : 'Pricing could not complete. Check the connection/provider configuration and retry. No price is applied by analysis.',
      },
      status === 403 ? 403 : 502,
    );
  }
}
function reply(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      Vary: 'Authorization',
      'X-Robots-Tag': 'noindex',
    },
  });
}
