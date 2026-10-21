import { defineField } from 'sanity';
import { validAssociateTag, validAmazonAffiliateUrl } from '../lib/amazon';
import { amazonFieldsVisible, type CatalogFields } from '../lib/catalog';
export const amazonProductFields = [
  defineField({
    name: 'experienceStatus',
    title: 'Experience status',
    type: 'string',
    options: {
      list: [
        { title: 'Personally tested', value: 'tested' },
        { title: 'Mannequin-only demonstration', value: 'mannequin' },
        { title: 'Curated / not tested', value: 'curated' },
      ],
    },
    description:
      'When blank, the legacy Personally tried field is respected. Mannequin demonstrations cannot establish human comfort, movement, wash performance or durability.',
  }),
  defineField({
    name: 'whyPicked',
    title: 'Why I picked it (original editorial commentary)',
    type: 'text',
    rows: 4,
    description:
      'Your selection reasoning, not an Amazon description or an invented first-hand observation.',
  }),
  defineField({ name: 'testedSize', title: 'Size actually tested / demonstrated', type: 'string' }),
  defineField({
    name: 'fitObservations',
    title: 'Actual fit evidence / demonstration notes',
    type: 'text',
    rows: 4,
    description:
      'Describe only observations you can substantiate. Identify mannequin-only evidence clearly.',
  }),
  defineField({
    name: 'sellerSpecifications',
    title: 'Seller-reported specifications',
    type: 'text',
    rows: 4,
    description:
      'Paraphrase relevant listing facts and their source. Do not paste Amazon descriptions, customer reviews or ratings, or add Amazon price, stock or discount claims without a permitted integration.',
  }),
  defineField({
    name: 'whatToCheck',
    title: 'Limitations / what shoppers should check',
    type: 'text',
    rows: 4,
  }),
  defineField({ name: 'editorialReviewedAt', title: 'Editorial review date', type: 'date' }),
  defineField({
    name: 'contentReviewStatus',
    title: 'Editorial and image-source review',
    type: 'string',
    initialValue: 'needs_review',
    options: {
      list: [
        { title: 'Needs review', value: 'needs_review' },
        { title: 'Reviewed and approved by editor', value: 'approved' },
      ],
    },
    description:
      'Approval confirms original commentary and reviewed content/image sources; it does not imply Amazon account approval.',
  }),
  defineField({
    name: 'indexingIntent',
    title: 'Search indexing intent',
    type: 'string',
    initialValue: 'index',
    hidden: true,
    options: {
      list: [
        { title: 'Keep out of search until useful', value: 'noindex' },
        { title: 'Index after editorial approval', value: 'index' },
      ],
    },
    description:
      'Amazon pages also need approved review status, original Why I picked it, limitations/checks and a review date. No automatic word-count gate.',
  }),
  ...['amazonAffiliateUrl', 'newAmazonAffiliateUrl'].map((name) =>
    defineField({
      name,
      title:
        name === 'amazonAffiliateUrl'
          ? 'Amazon-generated affiliate URL (optional)'
          : 'Shop-new Amazon affiliate URL (optional)',
      type: 'url',
      description:
        'Separate from the source Purchase link. Preserve valid Amazon-generated URLs. Leave blank to use the enrolled US Associate tag from Site settings. Inactive mode always uses ordinary links.',
      validation: (r) =>
        r.custom((value, context) =>
          !value ||
          validAmazonAffiliateUrl(
            value,
            undefined,
            Boolean(
              context.document?.[
                name === 'amazonAffiliateUrl'
                  ? 'amazonShortLinkVerified'
                  : 'newAmazonShortLinkVerified'
              ],
            ),
          )
            ? true
            : 'Use an HTTPS amazon.com URL with a valid US tag, or confirm an Amazon-generated amzn.to short link below.',
        ),
    }),
  ),
  ...['amazonShortLinkVerified', 'newAmazonShortLinkVerified'].map((name) =>
    defineField({
      name,
      title:
        name === 'amazonShortLinkVerified'
          ? 'I verified this Amazon-generated short link'
          : 'I verified the shop-new Amazon short link',
      type: 'boolean',
      initialValue: false,
      description:
        'Confirm it points to the correct product and belongs to the currently configured Associate account. The app does not follow or resolve short links.',
    }),
  ),
  defineField({
    name: 'relatedGuides',
    title: 'Related shopping / measurement guides',
    type: 'array',
    of: [{ type: 'reference', to: [{ type: 'blogPost' }] }],
  }),
  defineField({
    name: 'videoUrl',
    title: 'Original / authorized demonstration video (HTTPS MP4/WebM)',
    type: 'url',
    validation: (r) => r.uri({ scheme: ['https'] }),
  }),
  defineField({ name: 'transcript', title: 'Demonstration video transcript', type: 'text' }),
  defineField({
    name: 'videoCaptionsUrl',
    title: 'Video captions path',
    type: 'string',
    description: 'Local /captions/... VTT file.',
  }),
].map((field) => ({
  ...field,
  hidden: ({ document }: { document?: Record<string, unknown> }) =>
    !amazonFieldsVisible((document || {}) as CatalogFields) ||
    ('hidden' in field && field.hidden === true),
}));
export const amazonSettingsField = defineField({
  name: 'amazonAssociates',
  title: 'Amazon Associates',
  type: 'object',
  fields: [
    defineField({
      name: 'active',
      title: 'Activate Associate links and disclosures',
      type: 'boolean',
      initialValue: false,
      description:
        'Enable only after enrolling with a valid US Associate tag. Final application approval is not required for valid links during the review period. This does not enable API access.',
    }),
    defineField({
      name: 'tag',
      title: 'US Associate tracking ID (public, not a secret)',
      type: 'string',
      description: 'For example, your actual ID ending in -20. Never enter API keys here.',
      validation: (r) =>
        r.custom((value, context) =>
          (context.parent as { active?: boolean })?.active && !validAssociateTag(value)
            ? 'Enter your enrolled US Associate tag ending in -20 before activation.'
            : !value || validAssociateTag(value)
              ? true
              : 'Use a valid US Associate tracking ID ending in -20.',
        ),
    }),
    defineField({
      name: 'clickEventsEnabled',
      title: 'Enable consent-gated outbound click events',
      type: 'boolean',
      initialValue: false,
      description:
        'No analytics provider is installed by this setting. Configure the documented consent adapter and an approved analytics listener before enabling. No visitor-specific Amazon IDs are used.',
    }),
  ],
});
export const productPhotoSourceFields = [
  defineField({
    name: 'sourceKind',
    title: 'Image source',
    type: 'string',
    initialValue: 'unverified',
    options: {
      list: [
        { title: 'My original photo', value: 'original' },
        { title: 'Separately licensed / authorized photo', value: 'licensed' },
        { title: 'Amazon-sourced image (hidden)', value: 'amazon' },
        { title: 'Not verified (hidden for Amazon items)', value: 'unverified' },
      ],
    },
    description:
      'For Amazon items, only original photos or separately licensed images with credit/permission reference are displayed. Importing a CSV does not grant rights.',
  }),
  defineField({
    name: 'sourceCredit',
    title: 'Source credit / permission reference',
    type: 'string',
    description:
      'Public credit for licensed images; never enter private agreements, credentials or personal information.',
  }),
];
