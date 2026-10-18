import type { useClient } from 'sanity';
type SanityClient = ReturnType<typeof useClient>;
import { importEnvelopeSchema, importRecordSchema } from '@/lib/product-import-schema';
import type { ImportRecord } from '@/lib/product-import-schema';
import { poshmarkUrl } from '@/lib/urls';
import { INVENTORY_API_VERSION, publishedId } from '../inventory/model';

export interface ImportTarget {
  _id: string;
  _rev: string;
  _type: string;
  title?: string;
  sku?: string;
  shoppingSection?: string;
  affiliateLink?: boolean;
  photos?: unknown[];
  dataSource?: string;
  importSource?: string;
  externalListingId?: string;
  importEnabled?: boolean;
  closetPlatform?: string;
  poshmarkUrl?: string;
  purchaseUrl?: string;
  saleStatus?: string;
  availability?: string;
  listingPrice?: number;
  currency?: string;
  lastSuccessfullyCheckedAt?: string;
  [key: string]: unknown;
}
export type PoshmarkRecord = Extract<ImportRecord, { closetPlatform: 'poshmark' }>;
export type ImportChoice = 'create' | 'update' | 'link' | 'skip';
export interface PreviewRow {
  record: PoshmarkRecord;
  choice: ImportChoice;
  target?: ImportTarget;
  candidates: ImportTarget[];
  note: string;
}
export const eligible = (item: ImportTarget) =>
  item._type === 'product' && item.shoppingSection !== 'finds' && item.affiliateLink !== true;
export function primaryTargets(documents: ImportTarget[]) {
  const pairs = new Map<string, ImportTarget>();
  for (const item of documents) {
    if (item._id.startsWith('versions.')) continue;
    const id = publishedId(item._id);
    if (!pairs.has(id) || item._id.startsWith('drafts.')) pairs.set(id, item);
  }
  return [...pairs.values()];
}
export async function fetchImportTargets(base: SanityClient) {
  const client = base.withConfig({ perspective: 'raw', useCdn: false, stega: false });
  const all: ImportTarget[] = [];
  let cursor = '';
  for (;;) {
    const batch = await client.fetch<ImportTarget[]>(
      `*[_type=='product' && !(_id in path('versions.**')) && _id>$cursor] | order(_id asc)[0...500]`,
      { cursor },
    );
    all.push(...batch);
    if (batch.length < 500) break;
    cursor = batch[batch.length - 1]._id;
  }
  return primaryTargets(all);
}
const words = (text: string) => new Set(text.toLowerCase().match(/[a-z0-9]+/g) || []);
function similar(a: string, b: string) {
  const first = words(a),
    second = words(b);
  const shared = [...first].filter((word) => second.has(word)).length;
  return shared >= 3 && shared / Math.min(first.size, second.size) >= 0.65;
}
export function previewImport(
  records: PoshmarkRecord[],
  source: string,
  targets: ImportTarget[],
): PreviewRow[] {
  return records.map((record) => {
    const identity = targets.filter(
      (item) => item.importSource === source && item.externalListingId === record.externalListingId,
    );
    const urlMatches = targets.filter(
      (item) => poshmarkUrl(item.poshmarkUrl || item.purchaseUrl) === record.poshmarkUrl,
    );
    const candidates = targets.filter(
      (item) =>
        eligible(item) &&
        (item.sku === record.externalListingId || similar(item.title || '', record.title)),
    );
    if (identity.length > 1 || urlMatches.length > 1)
      return {
        record,
        choice: 'skip',
        candidates,
        note: 'Duplicate identity/listing requires resolution in Studio.',
      };
    const target = identity[0] || urlMatches[0];
    if (target) {
      if (!eligible(target))
        return {
          record,
          choice: 'skip',
          target,
          candidates,
          note: 'Curated/affiliate items cannot be imported as closet inventory.',
        };
      if (target.importEnabled === false)
        return {
          record,
          choice: 'skip',
          target,
          candidates,
          note: 'Listing imports are disabled. Enable them in the editor to update.',
        };
      if (
        target.dataSource === 'import' &&
        target.importSource === source &&
        target.externalListingId === record.externalListingId &&
        target.closetPlatform === 'poshmark'
      ) {
        if (
          target.lastSuccessfullyCheckedAt &&
          Date.parse(target.lastSuccessfullyCheckedAt) >=
            Date.parse(record.lastSuccessfullyCheckedAt)
        )
          return {
            record,
            choice: 'skip',
            target,
            candidates,
            note: 'Same or older report; retained last known data.',
          };
        return {
          record,
          choice: 'update',
          target,
          candidates,
          note: 'Update listing fields in the draft; editorial fields remain.',
        };
      }
      return {
        record,
        choice: 'skip',
        target,
        candidates: [target, ...candidates.filter((item) => item._id !== target._id)],
        note: 'Existing listing found. Choose this item explicitly to link it.',
      };
    }
    return {
      record,
      choice: candidates.length ? 'skip' : 'create',
      candidates,
      note: candidates.length
        ? 'Possible existing item. Match it or deliberately choose Create new.'
        : 'New item; photographs must be added in Studio.',
    };
  });
}
async function stableId(source: string, id: string) {
  const hash = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${source}\0${id}`),
  );
  return (
    'import-product-' +
    [...new Uint8Array(hash)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 40)
  );
}
function fields(record: PoshmarkRecord, current?: ImportTarget) {
  return {
    listingPrice: record.listingPrice,
    currency: record.currency,
    poshmarkUrl: record.poshmarkUrl,
    lastSuccessfullyCheckedAt: record.lastSuccessfullyCheckedAt,
    ...(current?.saleStatus === 'available' ||
    current?.saleStatus === 'sold' ||
    current?.availability === 'sold' ||
    current?.availability === 'reserved'
      ? {}
      : { availability: record.availability }),
  };
}
function draftCopy(item: ImportTarget) {
  const copy: Record<string, unknown> & { _id: string; _type: string } = {
    ...item,
    _id: `drafts.${publishedId(item._id)}`,
  };
  for (const key of ['_rev', '_createdAt', '_updatedAt']) delete copy[key];
  return copy;
}
/** All mutations are authenticated, revision-guarded, and draft-only. */
export async function applyImport(base: SanityClient, row: PreviewRow, source: string) {
  const client = base.withConfig({
    apiVersion: INVENTORY_API_VERSION,
    perspective: 'raw',
    useCdn: false,
    stega: false,
  });
  if (row.choice === 'skip') return 'skipped' as const;
  importEnvelopeSchema.parse({ version: 1, source, products: [row.record] });
  importRecordSchema.parse(row.record);
  const id = await stableId(source, row.record.externalListingId);
  const matches = await client.fetch<ImportTarget[]>(
    `*[_type=='product' && !(_id in path('versions.**')) && ((importSource==$source && externalListingId==$externalId) || poshmarkUrl==$url || purchaseUrl==$url || _id in $ids)]`,
    {
      source,
      externalId: row.record.externalListingId,
      url: row.record.poshmarkUrl,
      ids: [id, `drafts.${id}`],
    },
  );
  const identities = primaryTargets(matches);
  if (row.choice === 'create') {
    if (identities.length) throw new Error('This listing now exists. Preview again to match it.');
    const slug =
      row.record.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || 'closet-item';
    // Creating both an empty published guard and a draft would violate the workflow; only create the stable draft.
    await client.create({
      _id: `drafts.${id}`,
      _type: 'product',
      title: row.record.title,
      slug: { _type: 'slug', current: `${slug}-${id.slice(-12)}` },
      description: row.record.description || '',
      size: row.record.size || '',
      photos: [],
      shoppingSection: 'closet',
      closetPlatform: 'poshmark',
      dataSource: 'import',
      importEnabled: true,
      importSource: source,
      externalListingId: row.record.externalListingId,
      ...fields(row.record),
    });
    return 'created' as const;
  }
  if (!row.target) throw new Error('Choose an existing item.');
  const targetId = publishedId(row.target._id);
  if (identities.some((item) => publishedId(item._id) !== targetId))
    throw new Error('This listing is linked to a different item. Preview again.');
  const documents = (
    await client.getDocuments<ImportTarget>([targetId, `drafts.${targetId}`])
  ).filter((item): item is NonNullable<typeof item> => !!item);
  const current =
    documents.find((item) => item._id === `drafts.${targetId}`) ||
    documents.find((item) => item._id === targetId);
  if (!current || current._id !== row.target._id || current._rev !== row.target._rev)
    throw new Error('Item changed after preview. Preview again before importing.');
  if (!eligible(current) || current.importEnabled === false)
    throw new Error('This item is not eligible for listing imports.');
  if (
    row.choice === 'update' &&
    (current.dataSource !== 'import' ||
      current.importSource !== source ||
      current.externalListingId !== row.record.externalListingId ||
      current.closetPlatform !== 'poshmark')
  )
    throw new Error('Import ownership changed. Preview again.');
  if (
    current.lastSuccessfullyCheckedAt &&
    Date.parse(current.lastSuccessfullyCheckedAt) >=
      Date.parse(row.record.lastSuccessfullyCheckedAt) &&
    (row.choice === 'update' || current.closetPlatform === 'poshmark')
  )
    return 'skipped' as const;
  const update = {
    ...fields(row.record, current),
    ...(row.choice === 'link'
      ? {
          shoppingSection: 'closet',
          closetPlatform: 'poshmark',
          dataSource: 'import',
          importEnabled: true,
          importSource: source,
          externalListingId: row.record.externalListingId,
          ...(current.purchaseUrl ? { purchaseUrl: row.record.poshmarkUrl } : {}),
        }
      : {}),
  };
  if (current._id.startsWith('drafts.'))
    await client.patch(current._id).ifRevisionId(current._rev).set(update).commit();
  else
    await client
      .transaction()
      .patch(current._id, (patch) => patch.ifRevisionId(current._rev).set({}))
      .create({ ...draftCopy(current), ...update })
      .commit();
  return 'updated' as const;
}
