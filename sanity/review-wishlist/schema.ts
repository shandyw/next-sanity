import { defineField } from 'sanity';
import { amazonImage } from '../../lib/review-wishlist';
import { amazonFieldsVisible, type CatalogFields } from '../../lib/catalog';
const hideAmazonFields = (document?: Record<string, unknown>) =>
  !amazonFieldsVisible((document || {}) as CatalogFields);
/** Supporting fields on existing Curated Finds, not a separate product type. */
export const reviewWishlistFields = [
  defineField({
    name: 'onReviewWishlist',
    hidden: ({ document }) =>
      hideAmazonFields(document) || Array.isArray(document?.displayPlacements),
    title: 'Legacy review wishlist placement',
    type: 'boolean',
    initialValue: false,

    description: 'Legacy fallback. Use Display placements for new or updated catalog records.',
  }),
  defineField({
    name: 'amazonAsin',
    title: 'Amazon item ID (ASIN)',
    type: 'string',
    hidden: true,
    readOnly: true,
  }),
  defineField({
    name: 'importedImageUrl',
    title: 'Imported Amazon thumbnail',
    type: 'url',
    hidden: ({ document }) => hideAmazonFields(document),
    description:
      'Reference only; hidden publicly. A shared list does not establish permission to republish Amazon images. Add original or separately licensed photographs and record their source.',
    validation: (r) =>
      r.custom((v) => (!v || amazonImage(v) ? true : 'Use a supported Amazon image URL.')),
  }),
  defineField({
    name: 'priority',
    title: 'Review wishlist priority',
    type: 'string',
    initialValue: 'medium',
    options: { list: ['high', 'medium', 'low'] },
    hidden: ({ document }) => hideAmazonFields(document) || !document?.onReviewWishlist,
  }),
  defineField({
    name: 'requestedQuantity',
    title: 'Review wishlist quantity wanted',
    type: 'number',
    initialValue: 1,
    validation: (r) => r.integer().min(1),
    hidden: ({ document }) => hideAmazonFields(document) || !document?.onReviewWishlist,
  }),
  defineField({
    name: 'receivedQuantity',
    title: 'Review wishlist quantity received',
    type: 'number',
    initialValue: 0,
    validation: (r) => r.integer().min(0),
    hidden: ({ document }) => hideAmazonFields(document) || !document?.onReviewWishlist,
  }),
];
