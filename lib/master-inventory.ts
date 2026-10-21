import { z } from 'zod';
import { parseInventoryCsv } from './csv';
import { vintedUrl } from './urls';

export function masterListing(value?: string) {
  const vinted = vintedUrl(value);
  if (vinted) return { platform: 'vinted' as const, url: vinted };
}

export const MASTER_INVENTORY_SOURCE = 'cgr-master-inventory';
export const MASTER_HEADERS = [
  'SKU',
  'STATUS',
  'NAME',
  'DESCRIPTION',
  'BRAND',
  'CATEGORY',
  'CONDITION',
  'SIZE',
  'IMAGES',
  'VINTED',
  'URL',
] as const;
const price = z.number().finite().min(0).optional();
export const masterRecordSchema = z
  .object({
    sku: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/),
    status: z.enum(['available', 'sold']),
    title: z.string().trim().min(1).max(160),
    description: z.string().max(5000),
    brand: z.string().trim().max(160),
    category: z.string().trim().max(160).optional(),
    condition: z.string().trim().max(160).optional(),
    size: z.string().trim().max(60),
    images: z.array(z.string().min(1).max(255)).max(20),
    vinted: price,
    url: z
      .string()
      .trim()
      .max(2048)
      .refine(
        (value) => Boolean(masterListing(value)),
        'URL must be an HTTPS Vinted item URL.',
      )
      .transform((value) => masterListing(value)!.url)
      .optional(),
  })
  .strict();
export type MasterRecord = z.infer<typeof masterRecordSchema>;
export const skuKey = (sku: string) => sku.trim().toLowerCase();
export function imageNames(value: string) {
  if (!value.trim()) return [];
  const names = value
    .split(/[|\n]/)
    .map((name) => name.trim())
    .filter(Boolean);
  if (new Set(names).size !== names.length) throw new Error('IMAGES repeats a filename.');
  for (const name of names) {
    if (
      /[\\/]/.test(name) ||
      name === '.' ||
      name === '..' ||
      !/\.(jpe?g|png|webp|heic|heif|avif)$/i.test(name)
    )
      throw new Error(
        'IMAGES must contain image filenames separated by |, without folders or URLs. Select the matching files in Studio.',
      );
  }
  return names;
}
function amount(value: string, column: string) {
  if (!value.trim()) return undefined;
  const clean = value.trim().replace(/^\$\s*/, '');
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(clean))
    throw new Error(`${column} must contain a price such as $54 or 54.00, not a listing URL.`);
  return Number(clean.replaceAll(',', ''));
}
export function parseMasterInventory(csv: string) {
  const { headers, rows } = parseInventoryCsv(csv);
  const normalized = headers.map((header) => header.trim().toUpperCase());
  if (new Set(normalized).size !== normalized.length)
    throw new Error('CSV has duplicate column names.');
  const missing = MASTER_HEADERS.filter(
    (header) => !['URL', 'CATEGORY', 'CONDITION'].includes(header) && !normalized.includes(header),
  );
  const extra = normalized.filter(
    (header) => !MASTER_HEADERS.includes(header as (typeof MASTER_HEADERS)[number]),
  );
  if (missing.length || extra.length)
    throw new Error(
      `Use the master columns: ${MASTER_HEADERS.join(', ')}. ${missing.length ? `Missing: ${missing.join(', ')}. ` : ''}${extra.length ? `Unexpected: ${extra.join(', ')}.` : ''}`,
    );
  const records: MasterRecord[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const [index, row] of rows.entries()) {
    try {
      if (row.length !== headers.length) throw new Error('Column count does not match the header.');
      const get = (name: (typeof MASTER_HEADERS)[number]) =>
        row[normalized.indexOf(name)]?.trim() || '';
      const record = masterRecordSchema.parse({
        sku: get('SKU'),
        status: get('STATUS').toLowerCase(),
        title: get('NAME'),
        description: get('DESCRIPTION'),
        brand: get('BRAND'),
        ...(get('CATEGORY') ? { category: get('CATEGORY') } : {}),
        ...(get('CONDITION') ? { condition: get('CONDITION') } : {}),
        size: get('SIZE'),
        images: imageNames(get('IMAGES')),
        vinted: amount(get('VINTED'), 'VINTED'),
        ...(get('URL') ? { url: get('URL') } : {}),
      });
      const key = skuKey(record.sku);
      if (seen.has(key))
        throw new Error(
          `SKU ${record.sku} appears more than once. Each physical item must have one row.`,
        );
      seen.add(key);
      records.push(record);
    } catch (cause) {
      errors.push(`Row ${index + 2}: ${cause instanceof Error ? cause.message : 'Invalid record'}`);
    }
  }
  return { records, errors };
}
