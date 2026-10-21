import { defineType, defineField, defineArrayMember } from 'sanity';
import {
  catalogSource,
  amazonFieldsVisible,
  catalogPlacements,
  placementError,
  type CatalogFields,
} from '../../lib/catalog';
import { ProductSourceInput } from './ProductSourceInput';
const closet = ({ document }: { document?: Record<string, unknown> }) =>
  catalogSource((document || {}) as CatalogFields) !== 'closet';
export const catalogProductFields = [
  defineField({
    name: 'catalogSource',
    title: 'Product source',
    type: 'string',
    initialValue: 'closet',
    components: { input: ProductSourceInput },
    options: {
      list: [
        { title: 'Physical closet inventory', value: 'closet' },
        { title: 'Amazon product', value: 'amazon' },
      ],
    },
    description:
      'Changing the source selects its matching display placement. A received Amazon item later sold is a separate physical inventory record.',
  }),
  defineField({
    name: 'displayPlacements',
    title: 'Display placements',
    type: 'array',
    initialValue: ['closet'],
    of: [defineArrayMember({ type: 'string' })],
    options: {
      list: [
        { title: 'My Closet', value: 'closet' },
        { title: 'Curated Finds', value: 'finds' },
        { title: 'My Review Wishlist', value: 'reviewWishlist' },
      ],
    },
    description:
      'Empty selection hides the product from collections but keeps its detail page and references. Legacy fields apply only when this field has never been set.',
    validation: (r) =>
      r.unique().custom((_v, c) => placementError(c.document as CatalogFields) || true),
  }),
  defineField({
    name: 'archived',
    title: 'Archived',
    type: 'boolean',
    initialValue: false,
    description:
      'Removes from public collections and disables shopping, while retaining detail, saved-item and review references. Publish to apply.',
  }),
  defineField({
    name: 'reviewProgress',
    title: 'Review progress',
    type: 'string',
    hidden: ({ document }) => catalogSource((document || {}) as CatalogFields) === 'closet',
    options: {
      list: [
        { title: 'Not requested', value: 'not_requested' },
        { title: 'Wanted', value: 'wanted' },
        { title: 'Received', value: 'received' },
        { title: 'In progress', value: 'in_progress' },
        { title: 'Reviewed', value: 'reviewed' },
      ],
    },
    description:
      'Independent of publication and availability. Marking received does not claim an item has been tested.',
  }),
  defineField({
    name: 'underlyingProduct',
    title: 'Underlying Amazon product (optional)',
    type: 'reference',
    to: [{ type: 'product' }],
    hidden: closet,
    options: {
      filter: ({ document }) => ({
        filter:
          '_id != $id && (_type == "product") && (catalogSource == "amazon" || shoppingSection == "finds")',
        params: { id: String(document._id).replace(/^drafts\./, '') },
      }),
    },
    description:
      'Link a separately owned physical garment to its catalog counterpart; never merges physical inventory units.',
  }),
  defineField({
    name: 'desiredSize',
    title: 'Desired size for review',
    type: 'string',
    hidden: ({ document }) =>
      !catalogPlacements((document || {}) as CatalogFields).includes('reviewWishlist'),
  }),
  defineField({
    name: 'desiredColor',
    title: 'Desired color for review',
    type: 'string',
    hidden: ({ document }) =>
      !catalogPlacements((document || {}) as CatalogFields).includes('reviewWishlist'),
  }),
  defineField({
    name: 'relatedProducts',
    title: 'Related products',
    type: 'array',
    of: [
      defineArrayMember({
        type: 'reference',
        to: [{ type: 'product' }],
        options: {
          filter: ({ document }) => ({
            filter: '_id != $id && !references($id)',
            params: { id: String(document._id).replace(/^drafts\./, '') },
          }),
        },
      }),
    ],
    validation: (r) =>
      r.unique().custom(async (v, c) => {
        const id = String(c.document?._id).replace(/^drafts\./, '');
        if (v?.some((x) => (x as { _ref: string })._ref === id))
          return 'A product cannot reference itself.';
        if (!v?.length) return true;
        try {
          const docs = await c
            .getClient({ apiVersion: '2026-10-01' })
            .withConfig({ perspective: 'raw', useCdn: false })
            .fetch<{ _id: string; relatedProducts?: { _ref: string }[] }[]>(
              '*[_type=="product" && !(_id in path("versions.**"))]{_id,relatedProducts}',
            );
          const graph = new Map<string, string[]>();
          for (const d of docs) {
            const key = d._id.replace(/^drafts\./, '');
            if (!graph.has(key) || d._id.startsWith('drafts.'))
              graph.set(
                key,
                (d.relatedProducts || []).map((x) => x._ref),
              );
          }
          const seen = new Set<string>();
          const reaches = (key: string): boolean =>
            key === id || (!seen.has(key) && (seen.add(key), (graph.get(key) || []).some(reaches)));
          return v.some((x) => reaches((x as { _ref: string })._ref))
            ? 'Related products would create a cycle.'
            : true;
        } catch {
          return 'Unable to validate related products. Reconnect before publishing.';
        }
      }),
  }),
  defineField({
    name: 'importOverrides',
    title: 'Keep these source facts under Studio control',
    type: 'array',
    hidden: true,
    initialValue: [
      'title',
      'brand',
      'categories',
      'size',
      'condition',
      'availability',
      'purchaseUrl',
      'vintedUrl',
      'listingPrice',
      'vintedPrice',
    ],
    of: [defineArrayMember({ type: 'string' })],
    options: {
      list: [
        'title',
        'brand',
        'categories',
        'size',
        'condition',
        'availability',
        'purchaseUrl',
        'vintedUrl',
        'listingPrice',
        'vintedPrice',
      ],
    },
    description:
      'Checked fields are preserved on CSV re-import. Description, custom images, placements, archive state and review relationships always belong to Studio.',
  }),
  defineField({ name: 'lastImportedAt', title: 'Last imported', type: 'datetime', readOnly: true }),
  defineField({
    name: 'importedFacts',
    title: 'Last imported source facts (admin reference; public dataset)',
    type: 'object',
    hidden: true,
    readOnly: true,
    fields: [
      defineField({ name: 'title', type: 'string' }),
      defineField({ name: 'fingerprint', type: 'string' }),
    ],
  }),
  defineField({
    name: 'referencePrice',
    title: 'Amazon reference price — admin only',
    type: 'string',
    hidden: ({ document }) => !amazonFieldsVisible((document || {}) as CatalogFields),
    description:
      'Not live price. Excluded from site queries; still readable through a public Sanity dataset.',
  }),
];
export const reviewCatalogFields = [
  defineField({
    name: 'reviewedProducts',
    title: 'Reviewed products',
    type: 'array',
    of: [defineArrayMember({ type: 'reference', to: [{ type: 'product' }] })],
    validation: (r) => r.unique(),
    description: 'Select existing records. Sold and archived items remain linked.',
  }),
  defineField({
    name: 'readerProvided',
    title: 'Reader-provided item',
    type: 'boolean',
    initialValue: false,
  }),
  defineField({
    name: 'senderNamePermission',
    title: 'Permission to display the sender name',
    type: 'boolean',
    initialValue: false,
    hidden: ({ document }) => !document?.readerProvided,
    description:
      'Enable only after obtaining permission for the public display name and thank-you text.',
  }),
  defineField({
    name: 'senderDisplayName',
    title: 'Public sender display name',
    type: 'string',
    hidden: ({ document }) => !document?.readerProvided || !document?.senderNamePermission,
    validation: (r) =>
      r
        .max(80)
        .custom((v, c) =>
          !v || c.document?.senderNamePermission === true
            ? true
            : 'Remove the sender name or obtain permission. Never store contact details here.',
        ),
  }),
  defineField({
    name: 'thankYouMessage',
    title: 'Public thank-you message',
    type: 'text',
    rows: 2,
    hidden: ({ document }) => !document?.readerProvided || !document?.senderNamePermission,
    description:
      'No emails, phone numbers or private details. Without permission the site uses a fixed anonymous thank-you.',
    validation: (r) =>
      r
        .max(300)
        .custom((v, c) =>
          !v
            ? true
            : c.document?.senderNamePermission !== true
              ? 'Custom text requires permission; otherwise use the anonymous default.'
              : /\S+@\S+|https?:\/\/|\+?\d[\d ().-]{7,}\d/.test(v)
                ? 'Remove contact details and URLs.'
                : true,
        ),
  }),
];
export const productCollection = defineType({
  name: 'productCollection',
  title: 'Collection / outfit',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'products',
      title: 'Products (ordered)',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'product' }] })],
      validation: (r) => r.unique(),
    }),
  ],
});
