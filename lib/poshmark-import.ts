import { z } from 'zod';
import { importRecordSchema } from './product-import-schema';
import { poshmarkUrl } from './urls';

export const poshmarkMappingSchema = z
  .object({
    source: z.string().regex(/^poshmark-[a-z0-9][a-z0-9_-]{0,54}$/),
    currency: z.enum(['USD', 'CAD']),
    region: z.enum(['com', 'ca']).default('com'),
    headerRow: z.number().int().min(1).max(100).default(1),
    listingUrls: z
      .record(
        z.string(),
        z
          .string()
          .refine((value) => Boolean(poshmarkUrl(value)), 'Use a valid HTTPS Poshmark listing URL'),
      )
      .optional(),
    columns: z
      .object({
        externalListingId: z.string().min(1),
        title: z.string().min(1),
        listingPrice: z.string().min(1),
        listingUrl: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        size: z.string().min(1).optional(),
      })
      .strict(),
  })
  .strict();

/** Local CSV parser: quoted commas, escaped quotes, CRLF, multiline fields and BOM. */
export function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    value = '',
    quoted = false,
    closed = false;
  text = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
        closed = true;
      } else value += character;
    } else if (character === ',' || character === '\n' || character === '\r') {
      row.push(value);
      value = '';
      closed = false;
      if (character !== ',') {
        if (character === '\r' && text[index + 1] === '\n') index++;
        rows.push(row);
        row = [];
      }
    } else if (character === '"' && value === '' && !closed) quoted = true;
    else {
      if (closed && character.trim()) throw new Error('Unexpected text after a quoted CSV field.');
      value += character;
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}
export function parseInventoryCsv(text: string, headerRow = 1) {
  const rows = parseCsvRows(text);
  const headers = rows[headerRow - 1]?.map((header) => header.trim());
  const dataRows = rows.slice(headerRow).filter((row) => row.some((cell) => cell.trim()));
  if (
    !headers?.length ||
    new Set(headers).size !== headers.length ||
    headers.some((header) => !header)
  )
    throw new Error('CSV requires nonempty, unique column headers.');
  if (dataRows.length > 10000) throw new Error('CSV exceeds 10,000 records.');
  return { headers, rows: dataRows };
}

export function convertPoshmarkInventory(
  csv: string,
  mapping: z.infer<typeof poshmarkMappingSchema>,
  checkedAt: string,
) {
  const { headers, rows } = parseInventoryCsv(csv, mapping.headerRow);
  for (const name of Object.values(mapping.columns)) {
    if (!headers.includes(name)) throw new Error(`Mapped column is missing: ${name}`);
  }
  const products: z.infer<typeof importRecordSchema>[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const [index, row] of rows.entries()) {
    try {
      if (row.length !== headers.length) throw new Error('Column count does not match the header.');
      const get = (name?: string) => (name ? row[headers.indexOf(name)].trim() : undefined);
      const id = get(mapping.columns.externalListingId)!;
      const title = get(mapping.columns.title)!;
      const suppliedUrl = get(mapping.columns.listingUrl) || mapping.listingUrls?.[id];
      if (!suppliedUrl && !/^[a-f0-9]{24}$/i.test(id))
        throw new Error(
          `Listing ${id} needs its Poshmark URL. Add it to listingUrls in the mapping, or map a listing URL column. A seller SKU cannot be used to generate a listing URL.`,
        );
      const slug =
        title
          .replace(/[^A-Za-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 100) || 'Item';
      const amount = get(mapping.columns.listingPrice)!
        .replace(/^[\s$]+/, '')
        .replaceAll(',', '');
      if (!/^\d+(?:\.\d{1,2})?$/.test(amount))
        throw new Error('Price must be a nonnegative amount with at most two decimal places.');
      const record = importRecordSchema.parse({
        closetPlatform: 'poshmark',
        externalListingId: id,
        title,
        listingPrice: Number(amount),
        currency: mapping.currency,
        // Official inventory exports contain available items; absence never implies sold.
        availability: 'available',
        poshmarkUrl: suppliedUrl
          ? poshmarkUrl(suppliedUrl) || suppliedUrl
          : `https://poshmark.${mapping.region}/listing/${slug}-${id}`,
        lastSuccessfullyCheckedAt: checkedAt,
        ...(mapping.columns.description ? { description: get(mapping.columns.description) } : {}),
        ...(mapping.columns.size ? { size: get(mapping.columns.size) } : {}),
      });
      if (seen.has(id)) {
        skipped++;
        continue;
      }
      seen.add(id);
      products.push(record);
    } catch (error) {
      errors.push(
        `Row ${index + mapping.headerRow + 1}: ${error instanceof Error ? error.message : 'Invalid record'}`,
      );
    }
  }
  return {
    envelope: { version: 1 as const, source: mapping.source, products },
    summary: { converted: products.length, skipped, failed: errors.length },
    errors,
  };
}

/** Recognize common official export headers without executing or trusting report notes. */
export function inspectPoshmarkCsv(text: string) {
  const rows = parseCsvRows(text);
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliases = {
    externalListingId: ['listingid', 'listingsku', 'itemsku'],
    title: ['listingtitle', 'title'],
    listingPrice: ['currentlistingprice', 'listingprice', 'price'],
    listingUrl: ['listingurl', 'url'],
    size: ['size'],
    description: ['description', 'listingdescription'],
  };
  for (const [index, row] of rows.slice(0, 100).entries()) {
    const headers = row.map((value) => value.trim());
    const find = (names: string[]) =>
      names.map((name) => headers.find((header) => normalize(header) === name)).find(Boolean);
    if (!find(aliases.title) || !find(aliases.listingPrice) || !find(aliases.externalListingId))
      continue;
    const columns = Object.fromEntries(
      Object.entries(aliases)
        .map(([key, names]) => [key, find(names)])
        .filter(([, value]) => !!value),
    );
    const intro = rows.slice(0, index).flat().join(' ');
    const username = intro.match(/Inventory Report for @([A-Za-z0-9_-]+)/i)?.[1]?.toLowerCase();
    const date = intro.match(/Inventory as of (\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    const reportDate = date
      ? `${date[3]}-${date[1].padStart(2, '0')}-${date[2].padStart(2, '0')}`
      : '';
    return {
      headerRow: index + 1,
      columns,
      source: username ? `poshmark-${username}` : '',
      reportDate,
    };
  }
  throw new Error(
    'Could not recognize the CSV headings. Expected Listing Title, Current Listing Price, and Listing SKU or Listing ID.',
  );
}
