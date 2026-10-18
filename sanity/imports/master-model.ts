import type { useClient } from 'sanity';
import {
  MASTER_INVENTORY_SOURCE,
  masterRecordSchema,
  masterListing,
  skuKey,
  type MasterRecord,
} from '@/lib/master-inventory';
import { PRODUCT_IMAGE } from '@/lib/product-images';
import { fetchMasterImages, resolveMasterImage } from './master-images';
import { eligible, primaryTargets, type ImportTarget } from './model';
import { publishedId, INVENTORY_API_VERSION } from '../inventory/model';

type Client = ReturnType<typeof useClient>;
export interface MasterRow {
  record: MasterRecord;
  choice: 'create' | 'update' | 'match' | 'skip';
  target?: ImportTarget;
  candidates: ImportTarget[];
  note: string;
}
export interface MasterPhoto {
  _key: string;
  _type: 'image';
  asset: { _type: 'reference'; _ref: string };
  alt: string;
  sourceFilenames?: string[];
}
export const normalizeBrand = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
export async function masterStableId(namespace: string, key: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${namespace}\0${key}`),
  );
  return (
    `master-${namespace}-` +
    [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 40)
  );
}
export function previewMaster(records: MasterRecord[], targets: ImportTarget[]): MasterRow[] {
  return records.map((record) => {
    const exact = targets.filter(
      (item) =>
        skuKey(String(item.masterInventorySku || item.sku || '')) === skuKey(record.sku) ||
        skuKey(item.sku || '') === skuKey(record.sku),
    );
    const candidates = targets.filter(
      (item) =>
        eligible(item) &&
        (skuKey(item.externalListingId || '') === skuKey(record.sku) ||
          item.title?.toLowerCase() === record.title.toLowerCase()),
    );
    if (exact.length > 1)
      return {
        record,
        choice: 'skip',
        candidates: exact,
        note: 'Duplicate SKU identities: resolve them in Studio before importing.',
      };
    if (exact[0]) {
      const target = exact[0];
      if (!eligible(target) || target.importEnabled === false)
        return {
          record,
          choice: 'skip',
          target,
          candidates: [],
          note: 'Not eligible: Curated Finds/affiliate item or imports disabled.',
        };
      return {
        record,
        choice: 'update',
        target,
        candidates: [],
        note: 'Update this SKU from the master sheet. Save to draft only.',
      };
    }
    return {
      record,
      choice: candidates.length ? 'skip' : 'create',
      candidates,
      note: candidates.length
        ? 'Possible legacy item. Match explicitly to retain its URL, photos and review links.'
        : 'New item. Add listing links and any other required fields before publishing.',
    };
  });
}
interface MasterFields {
  sku: string;
  masterInventorySku: string;
  title: string;
  saleStatus: 'available' | 'sold';
  availability: 'available' | 'sold';
  description?: string;
  size?: string;
  brand?: { _type: 'reference'; _ref: string };
  categories?: { _key: string; _type: 'reference'; _ref: string }[];
  condition?: string;
  photos?: MasterPhoto[];
  poshmarkPrice?: { amount: number; currency: string };
  vintedPrice?: { amount: number; currency: string };
  listingPrice?: number;
  currency?: string;
  closetPlatform?: 'vinted' | 'poshmark';
  purchaseUrl?: string;
  poshmarkUrl?: string;
  vintedUrl?: string;
}
function changedFields(
  record: MasterRecord,
  current: ImportTarget | undefined,
  currency: string,
  photos: MasterPhoto[] | undefined,
  brandId: string | undefined,
  categoryId: string | undefined,
): MasterFields {
  const link = masterListing(record.url);
  const previousPlatform = current?.closetPlatform === 'poshmark' ? 'poshmark' : 'vinted';
  const selected =
    link?.platform ||
    (current
      ? current.closetPlatform === 'poshmark'
        ? 'poshmark'
        : 'vinted'
      : record.poshmark !== undefined
        ? 'poshmark'
        : 'vinted');
  const selectedPrice = record[selected];
  const switched = current && previousPlatform !== selected;
  const savedPrice = current?.[`${selected}Price`] as
    { amount?: unknown; currency?: unknown } | undefined;
  const savedPrimary =
    savedPrice &&
    typeof savedPrice.amount === 'number' &&
    Number.isFinite(savedPrice.amount) &&
    savedPrice.amount >= 0 &&
    typeof savedPrice.currency === 'string' &&
    /^[A-Z]{3}$/.test(savedPrice.currency)
      ? { listingPrice: savedPrice.amount, currency: savedPrice.currency }
      : {};
  return {
    sku: record.sku,
    masterInventorySku: record.sku,
    title: record.title,
    saleStatus: record.status,
    availability: record.status,
    ...(record.description ? { description: record.description } : {}),
    ...(record.size ? { size: record.size } : {}),
    ...(record.condition ? { condition: record.condition } : {}),
    ...(categoryId
      ? { categories: [{ _key: categoryId, _type: 'reference' as const, _ref: categoryId }] }
      : {}),
    ...(brandId ? { brand: { _type: 'reference', _ref: brandId } } : {}),
    ...(photos ? { photos } : {}),
    ...(record.poshmark !== undefined
      ? { poshmarkPrice: { amount: record.poshmark, currency } }
      : {}),
    ...(record.vinted !== undefined ? { vintedPrice: { amount: record.vinted, currency } } : {}),
    ...(selectedPrice !== undefined
      ? { listingPrice: selectedPrice, currency }
      : switched
        ? savedPrimary
        : {}),
    ...(!current || link ? { closetPlatform: selected } : {}),
    ...(link
      ? {
          purchaseUrl: link.url,
          ...(link.platform === 'poshmark' ? { poshmarkUrl: link.url } : { vintedUrl: link.url }),
        }
      : {}),
  };
}
export async function fetchMasterLabels(base: Client, type: 'brand' | 'clothingCategory') {
  const client = base.withConfig({ perspective: 'raw', useCdn: false, stega: false });
  const all: ImportTarget[] = [];
  let cursor = '';
  for (;;) {
    const batch = await client.fetch<ImportTarget[]>(
      `*[_type=='${type}' && !(_id in path('versions.**')) && _id>$cursor] | order(_id asc)[0...500]`,
      { cursor },
    );
    all.push(...batch);
    if (batch.length < 500) break;
    cursor = batch[batch.length - 1]._id;
  }
  return primaryTargets(all);
}
export const fetchMasterBrands = (base: Client) => fetchMasterLabels(base, 'brand');
function draftCopy(item: ImportTarget) {
  const copy: Record<string, unknown> & { _id: string; _type: string } = {
    ...item,
    _id: `drafts.${publishedId(item._id)}`,
  };
  for (const key of ['_rev', '_createdAt', '_updatedAt']) delete copy[key];
  return copy;
}
export async function applyMasterRow(
  base: Client,
  row: MasterRow,
  currency: 'USD' | 'CAD' | 'GBP' | 'EUR',
  files: Map<string, File>,
  expectedBrands: ImportTarget[],
  expectedCategories: ImportTarget[] = [],
) {
  if (row.choice === 'skip') return 'skipped' as const;
  const record = masterRecordSchema.parse(row.record);
  const client = base.withConfig({
    apiVersion: INVENTORY_API_VERSION,
    perspective: 'raw',
    useCdn: false,
    stega: false,
  });
  const id = await masterStableId('inventory', skuKey(record.sku));
  const matches = await client.fetch<ImportTarget[]>(
    `*[_type=='product' && !(_id in path('versions.**')) && (lower(sku)==$sku || lower(masterInventorySku)==$sku || _id in $ids)]`,
    { sku: skuKey(record.sku), ids: [id, `drafts.${id}`] },
  );
  const identities = primaryTargets(matches);
  let current: ImportTarget | undefined;
  if (row.choice === 'create') {
    if (identities.length) throw Error('SKU already exists. Preview again to match it.');
  } else {
    if (!row.target) throw Error('Choose an existing item.');
    const targetId = publishedId(row.target._id);
    if (identities.some((item) => publishedId(item._id) !== targetId))
      throw Error('SKU belongs to another item. Preview again.');
    const docs = await client.getDocuments<ImportTarget>([targetId, `drafts.${targetId}`]);
    current = docs[1] || docs[0] || undefined;
    if (!current || current._id !== row.target._id || current._rev !== row.target._rev)
      throw Error('Item changed after preview. Preview again.');
    if (!eligible(current) || current.importEnabled === false)
      throw Error('This item is not eligible for imports.');
  }
  // Recheck saved assets at confirmation, including older uploads matched by original filename.
  const existingImages = await fetchMasterImages(
    client,
    record.images.filter((name) => !files.has(name)),
    current ? [current] : [],
  );
  for (const filename of record.images) {
    const file = files.get(filename);
    if (file && file.size > PRODUCT_IMAGE.maxBytes) throw Error(`${filename} exceeds 20 MB.`);
    if (!file) {
      const match = resolveMasterImage(filename, current, existingImages);
      if (!match.asset)
        throw Error(
          `${match.ambiguous ? 'Multiple uploaded images match' : 'Select the photo file'} ${filename}.${match.ambiguous ? ' Select the intended file to resolve this.' : ''}`,
        );
    }
  }
  async function resolveLabel(type: 'brand' | 'clothingCategory', label?: string) {
    let labelId: string | undefined;
    if (label) {
      const brands = await fetchMasterLabels(client, type);
      const found = brands.filter(
        (brand) => normalizeBrand(brand.title || '') === normalizeBrand(label),
      );
      if (found.length > 1)
        throw Error(`Multiple ${type} labels match ${label}. Resolve duplicates in Studio.`);
      if (found[0]) {
        if (found[0]._id.startsWith('drafts.'))
          throw Error(`Publish ${type} ${label} before importing items that reference it.`);
        const expected = (type === 'brand' ? expectedBrands : expectedCategories).find(
          (brand) => brand._id === found[0]._id,
        );
        if (expected && expected._rev !== found[0]._rev)
          throw Error('Label changed after preview. Preview again.');
        labelId = found[0]._id;
      } else {
        labelId = await masterStableId(type, normalizeBrand(label));
        await client.createIfNotExists({
          _id: labelId,
          _type: type,
          title: label,
          slug: {
            _type: 'slug',
            current:
              label
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') || labelId,
          },
        });
      }
    }
    return labelId;
  }
  const brandId = await resolveLabel('brand', record.brand);
  const categoryId = await resolveLabel('clothingCategory', record.category);
  let photos: MasterPhoto[] | undefined;
  if (record.images.length) {
    photos = [];
    for (const [index, filename] of record.images.entries()) {
      const file = files.get(filename);
      const asset = file
        ? await client.assets.upload('image', file, { filename })
        : resolveMasterImage(filename, current, existingImages).asset!;
      const retained = current?.photos?.find(
        (photo) => (photo as MasterPhoto).asset?._ref === asset._id,
      ) as MasterPhoto | undefined;
      const duplicate = photos.find((photo) => photo.asset._ref === asset._id);
      if (duplicate) {
        duplicate.sourceFilenames = [...new Set([...(duplicate.sourceFilenames || []), filename])];
        continue;
      }
      photos.push(
        retained
          ? {
              ...retained,
              alt: retained.alt?.trim() ? retained.alt : record.title,
              sourceFilenames: [...new Set([...(retained.sourceFilenames || []), filename])],
            }
          : {
              _type: 'image',
              _key: `photo-${index}-${asset._id.slice(6, 18)}`,
              asset: { _type: 'reference', _ref: asset._id },
              alt: record.title,
              sourceFilenames: [filename],
            },
      );
    }
  }
  const fields = changedFields(record, current, currency, photos, brandId, categoryId);
  if (!current) {
    await client.create({
      _id: `drafts.${id}`,
      _type: 'product',
      shoppingSection: 'closet',
      dataSource: 'import',
      importSource: MASTER_INVENTORY_SOURCE,
      externalListingId: record.sku,
      importEnabled: true,
      slug: {
        _type: 'slug',
        current: `${record.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 70)}-${id.slice(-12)}`,
      },
      photos: [],
      ...fields,
    });
    return 'created' as const;
  }
  const link = masterListing(record.url);
  const switched =
    link && link.platform !== (current.closetPlatform === 'poshmark' ? 'poshmark' : 'vinted');
  // A different marketplace's asking price must not carry over when its new price is unknown.
  const unset =
    switched && fields.listingPrice === undefined
      ? ['listingPrice', 'currency'].filter((key) => current[key] !== undefined)
      : [];
  // Avoid producing another draft or revision when this row is already up to date.
  if (
    !unset.length &&
    Object.entries(fields).every(
      ([key, value]) => JSON.stringify(current[key]) === JSON.stringify(value),
    )
  )
    return 'skipped' as const;
  if (current._id.startsWith('drafts.')) {
    let patch = client.patch(current._id).ifRevisionId(current._rev).set(fields);
    if (unset.length) patch = patch.unset(unset);
    await patch.commit({ visibility: 'sync' });
  } else {
    const next: Record<string, unknown> & { _id: string; _type: string } = {
      ...draftCopy(current),
      ...fields,
    };
    for (const key of unset) delete next[key];
    await client
      .transaction()
      .patch(current._id, (patch) => patch.ifRevisionId(current!._rev).set({}))
      .create(next)
      .commit({ visibility: 'sync' });
  }
  return 'updated' as const;
}
