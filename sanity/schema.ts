import { measurementAreas } from '../lib/shannequin-measurements';
import { reviewSections } from '../lib/review-layout';
import { PRODUCT_IMAGE, productImageResolutionWarning } from '../lib/product-images';
import { defineType, defineField, defineArrayMember } from 'sanity';
import { vintedUrl, poshmarkUrl, closetShopUrl, safeExternal } from '../lib/urls';
import { SaleStatusInput } from './inventory/SaleStatusInput';
import { INVENTORY_API_VERSION, isInventorySkuUnique } from './inventory/model';
const slug = defineField({
  name: 'slug',
  title: 'URL slug',
  type: 'slug',
  options: { source: 'title', maxLength: 96 },
  validation: (r) => r.required(),
});
const title = defineField({
  name: 'title',
  title: 'Title',
  type: 'string',
  validation: (r) => r.required().max(160),
});
const ref = (name: string, type: string, label: string) =>
  defineField({ name, title: label, type: 'reference', to: [{ type }] });
const refs = (name: string, type: string, label: string) =>
  defineField({
    name,
    title: label,
    type: 'array',
    of: [defineArrayMember({ type: 'reference', to: [{ type }] })],
    validation: (r) => r.unique(),
  });
const image = (name: string, label: string) =>
  defineField({
    name,
    title: label,
    type: 'image',
    options: { hotspot: true },
    fields: [
      defineField({
        name: 'alt',
        title: 'Image description (alt text)',
        type: 'string',
        description: 'Describe the photo. Use owned or authorized imagery.',
        validation: (r) => r.required(),
      }),
    ],
  });
const url = (name: string, label: string) =>
  defineField({ name, title: label, type: 'url', validation: (r) => r.uri({ scheme: ['https'] }) });
const currency = (name: string, label: string) =>
  defineField({
    name,
    title: label,
    type: 'string',
    options: { list: ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'PLN', 'CZK', 'SEK', 'DKK'] },
    validation: (r) => r.regex(/^[A-Z]{3}$/),
  });
const seo = defineType({
  name: 'seo',
  title: 'Search and sharing',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'SEO title',
      type: 'string',
      validation: (r) => r.max(70),
    }),
    defineField({
      name: 'description',
      title: 'SEO description',
      type: 'text',
      rows: 3,
      validation: (r) => r.max(180),
    }),
    image('socialImage', 'Social sharing image'),
  ],
});
const body = defineType({
  name: 'richText',
  title: 'Article body',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Paragraph', value: 'normal' },
        { title: 'Heading 2', value: 'h2' },
        { title: 'Heading 3', value: 'h3' },
        { title: 'Quote', value: 'blockquote' },
      ],
      marks: {
        decorators: [
          { title: 'Strong', value: 'strong' },
          { title: 'Emphasis', value: 'em' },
        ],
        annotations: [
          {
            name: 'link',
            type: 'object',
            title: 'Link',
            fields: [
              {
                name: 'href',
                type: 'url',
                title: 'URL',
                validation: (r) => r.required().uri({ scheme: ['https', 'mailto'] }),
              },
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: { hotspot: true },
      fields: [
        {
          name: 'alt',
          title: 'Image description',
          type: 'string',
          validation: (r) => r.required(),
        },
      ],
    }),
  ],
});
const articleFields = [
  title,
  slug,
  defineField({
    name: 'excerpt',
    title: 'Short introduction',
    type: 'text',
    rows: 3,
    validation: (r) => r.required().max(320),
  }),
  ref('author', 'author', 'Author'),
  defineField({
    name: 'publishedAt',
    title: 'Publication date',
    type: 'datetime',
    validation: (r) => r.required(),
  }),
  image('featuredImage', 'Featured image'),
  defineField({
    name: 'body',
    title: 'Article',
    type: 'richText',
    validation: (r) => r.required(),
  }),
  defineField({ name: 'seo', title: 'SEO and social sharing', type: 'seo' }),
];
const review = defineType({
  name: 'review',
  title: 'Review',
  type: 'document',
  fields: [
    ...articleFields.map((field) =>
      field.name === 'body'
        ? defineField({
            ...field,
            title: 'Additional / legacy article copy',
            description:
              'Preserved for older reviews. New reviews use the four numbered sections below.',
            validation: undefined,
          })
        : field,
    ),
    defineField({
      name: 'titleAccent',
      title: 'Script phrase in the review headline (optional)',
      type: 'string',
      description:
        'An exact ending phrase from the full title, e.g. Questionable pockets. The title remains intact for SEO and review cards.',
      validation: (r) =>
        r
          .max(120)
          .custom((value, context) =>
            !value ||
            (typeof context.document?.title === 'string' && context.document.title.endsWith(value))
              ? true
              : 'Use the exact ending phrase of the full title.',
          ),
    }),
    defineField({
      name: 'reviewSections',
      title: 'Numbered review sections',
      type: 'object',
      description:
        'Four fixed sections. Change each heading and its copy independently. Numbers are added automatically.',
      initialValue: Object.fromEntries(
        reviewSections.map(({ key, heading }) => [key, { heading }]),
      ),
      fields: reviewSections.map(({ key, heading }, index) =>
        defineField({
          name: key,
          title: `${String(index + 1).padStart(2, '0')} — ${heading}`,
          type: 'object',
          fields: [
            defineField({
              name: 'heading',
              title: 'Section heading',
              type: 'string',
              initialValue: heading,
              validation: (r) => r.max(100),
            }),
            defineField({ name: 'copy', title: 'Section copy', type: 'richText' }),
          ],
        }),
      ),
    }),
    defineField({
      name: 'shannequinQuote',
      title: 'Shannequin says… (optional)',
      type: 'text',
      rows: 3,
      description:
        'Displays the shared Shannequin panel when supplied. Its image is managed once in Homepage → Shannequin full-body photograph.',
      validation: (r) => r.max(500),
    }),
    ref('ctaProduct', 'product', 'Bottom CTA — shopping item or curated find (optional)'),
    defineField({
      name: 'ctaLabel',
      title: 'Bottom CTA button label (optional)',
      type: 'string',
      description:
        'Defaults to View item details or Explore this find. The button opens the selected item’s detail page.',
      validation: (r) => r.max(80),
    }),
    defineField({
      name: 'titleHighlight',
      title: 'Legacy preview highlight (unused)',
      hidden: true,
      readOnly: true,
      type: 'string',
      description:
        'An exact word or phrase from the title to highlight in pink. Leave blank for a plain title.',
      validation: (rule) =>
        rule
          .max(100)
          .custom((value, context) =>
            !value ||
            (typeof context.document?.title === 'string' && context.document.title.includes(value))
              ? true
              : 'Use an exact phrase from the title.',
          ),
    }),
    defineField({
      name: 'photos',
      title: 'Additional try-on photos',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              title: 'Image description',
              type: 'string',
              validation: (r) => r.required(),
            },
            {
              name: 'caption',
              title: 'Thumbnail caption (optional)',
              type: 'string',
              validation: (r) => r.max(80),
            },
          ],
        }),
      ],
    }),
    defineField({
      name: 'format',
      title: 'Review format',
      type: 'string',
      initialValue: 'written',
      options: {
        list: [
          { title: 'Written', value: 'written' },
          { title: 'Video', value: 'video' },
          { title: 'Written and video', value: 'both' },
        ],
      },
      validation: (r) => r.required(),
    }),
    url('videoUrl', 'Video URL (authorized HTTPS MP4 or WebM)'),
    defineField({
      name: 'videoCaptionsUrl',
      title: 'English captions (.vtt path on this site)',
      type: 'string',
      description: 'Recommended for video accessibility. Missing captions do not block publishing.',
      validation: (r) => [
        r.custom((v) =>
          !v || /^\/(?!\/)[\w/.-]+\.vtt$/.test(v) ? true : 'Use a same-origin /path/file.vtt',
        ),
        r
          .custom((v, context) =>
            !v && (context.document?.format === 'video' || context.document?.format === 'both')
              ? 'Add captions to make this video accessible to viewers who cannot hear the audio.'
              : true,
          )
          .warning(),
      ],
    }),
    defineField({
      name: 'transcript',
      title: 'Video transcript (optional)',
      type: 'text',
      description: 'A readable text version of the video. Optional and does not block publishing.',
    }),
    defineField({ name: 'sizeWorn', title: 'Size worn', type: 'string' }),
    defineField({ name: 'fitNotes', title: 'Fit notes', type: 'text' }),
    defineField({
      name: 'priceWhenReviewed',
      title: 'Price when reviewed',
      type: 'number',
      description: 'Historical editorial price, separate from the current listing price.',
      validation: (r) => r.min(0),
    }),
    currency('reviewCurrency', 'Reviewed price currency'),
    refs('categories', 'clothingCategory', 'Clothing categories'),
    ref('brand', 'brand', 'Brand reviewed'),
    defineField({
      name: 'favorite',
      title: 'Show in My Faves',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  validation: (r) =>
    r.custom((d) => {
      if (d) {
        const sections = d.reviewSections as Record<string, { copy?: unknown[] }> | undefined;
        const hasSections = reviewSections.some(({ key }) => sections?.[key]?.copy?.length);
        if (hasSections && reviewSections.some(({ key }) => !sections?.[key]?.copy?.length))
          return 'Add copy to all four numbered sections, or clear them and use the legacy article field.';
        if (!hasSections && !(Array.isArray(d.body) && d.body.length))
          return 'Write the four numbered sections or supply legacy article copy.';
      }
      if (d && (d.format === 'video' || d.format === 'both') && !d.videoUrl)
        return 'Video reviews need a video URL.';
      if (d?.priceWhenReviewed !== undefined && !d.reviewCurrency)
        return 'Select the currency for the historical price.';
      return true;
    }),
});
const product = defineType({
  name: 'product',
  title: 'Shopping item',
  type: 'document',
  fields: [
    title,
    slug,
    defineField({
      name: 'sku',
      title: 'SKU',
      type: 'string',
      description:
        'Your unique inventory identifier, e.g. CGR-001. Leading zeros are preserved. Legacy items may leave this blank.',
      validation: (rule) =>
        rule.max(64).custom(async (value, context) => {
          if (!value) return true;
          if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value))
            return 'Use letters, numbers, hyphens or underscores without spaces.';
          try {
            const unique = await isInventorySkuUnique(
              context
                .getClient({ apiVersion: INVENTORY_API_VERSION })
                .withConfig({ perspective: 'raw', useCdn: false }),
              String(context.document?._id || ''),
              value,
            );
            return unique || 'This SKU is already assigned to another item (including drafts).';
          } catch {
            return 'Unable to check SKU uniqueness. Reconnect and validate before publishing.';
          }
        }),
    }),
    defineField({
      name: 'saleStatus',
      title: 'Sale Status',
      type: 'string',
      initialValue: 'available',
      options: {
        list: [
          { title: 'Available', value: 'available' },
          { title: 'Sold', value: 'sold' },
        ],
      },
      components: { input: SaleStatusInput },
      validation: (rule) =>
        rule.custom(
          (value) => !value || ['available', 'sold'].includes(value) || 'Select Available or Sold.',
        ),
    }),
    defineField({
      name: 'shoppingSection',
      title: 'Shopping section',
      type: 'string',
      initialValue: 'closet',
      options: {
        list: [
          { title: 'My Closet', value: 'closet' },
          { title: 'Curated Finds', value: 'finds' },
        ],
      },
      description: 'Existing items without this field remain in My Closet.',
    }),
    defineField({
      name: 'closetPlatform',
      title: 'Closet marketplace',
      type: 'string',
      initialValue: 'vinted',
      hidden: ({ document }) => document?.shoppingSection === 'finds',
      description:
        'Choose the primary marketplace for public purchase actions and the inventory asking-price total. You may keep links and master prices for both stores. Existing items without a selection remain on Vinted.',
      options: {
        list: [
          { title: 'Vinted', value: 'vinted' },
          { title: 'Poshmark', value: 'poshmark' },
        ],
      },
      validation: (rule) =>
        rule.custom(
          (value) =>
            !value || ['vinted', 'poshmark'].includes(value) || 'Choose Vinted or Poshmark.',
        ),
    }),
    defineField({
      ...url('purchaseUrl', 'Purchase link'),
      description:
        'Vinted or Poshmark listing for closet items; retailer product page for curated finds. The master CSV URL column fills this link and selects its marketplace. A blank URL cell preserves existing links.',
      validation: (r) =>
        r.custom((value, context) =>
          !value ||
          (context.document?.shoppingSection === 'finds'
            ? safeExternal(value)
            : context.document?.closetPlatform === 'poshmark'
              ? poshmarkUrl(value)
              : vintedUrl(value))
            ? true
            : 'Use an HTTPS retailer URL, or a listing from the selected closet marketplace.',
        ),
    }),
    defineField({
      name: 'retailer',
      title: 'Retailer name',
      type: 'string',
      description: 'Shown in Shop at [Retailer] buttons for curated finds.',
    }),
    defineField({
      name: 'affiliateLink',
      title: 'Purchase link earns commission',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'personallyTried',
      title: 'Personally tried',
      type: 'boolean',
      initialValue: false,
      description:
        'Select only if you have worn or tested this item. Otherwise curated items say Not yet tried.',
    }),
    defineField({
      name: 'availableSizes',
      title: 'Available sizes (curated finds)',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (r) => r.unique(),
    }),
    defineField({
      name: 'priceMaintained',
      title: 'Retailer price is reliably maintained',
      type: 'boolean',
      initialValue: false,
      description:
        'Curated prices and price filters are shown only when this is enabled. Confirm prices at the retailer.',
    }),
    defineField({
      ...url('newPurchaseUrl', 'Optional shop-new purchase link'),
      description:
        'For a closet item you also recommend buying new. Keep the same product and related review.',
    }),
    defineField({ name: 'newRetailer', title: 'Shop-new retailer name', type: 'string' }),
    defineField({
      name: 'newAffiliateLink',
      title: 'Shop-new link earns commission',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({ name: 'description', title: 'Description', type: 'text' }),
    defineField({
      name: 'photos',
      title: 'Photos (owned or authorized)',
      description:
        '4:5 portrait. Minimum 800 × 1000 px after cropping; recommended 1080 × 1350 px. Maximum 20 MB per photo. Use the Product card 4:5 preview to check framing. JPEG/PNG recommended; export HEIC to JPEG/PNG if conversion is needed.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          options: {
            hotspot: {
              previews: [
                { title: 'Product card — 4:5 portrait', aspectRatio: PRODUCT_IMAGE.aspectRatio },
              ],
            },
            accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif',
          },
          validation: (rule) => [
            rule.custom(async (value, context) => {
              if (!value?.asset?._ref) return true;
              try {
                const asset = await context
                  .getClient({ apiVersion: INVENTORY_API_VERSION })
                  .fetch<{ size?: number } | null>('*[_id == $id][0]{size}', {
                    id: value.asset._ref,
                  });
                return !asset?.size || asset.size <= PRODUCT_IMAGE.maxBytes
                  ? true
                  : 'This photo exceeds 20 MB. Compress or replace it before publishing.';
              } catch {
                return 'Unable to check image size. Reconnect and validate before publishing.';
              }
            }),
            rule.custom(productImageResolutionWarning).warning(),
          ],
          fields: [
            defineField({
              name: 'sourceFilenames',
              title: 'Original import filenames',
              type: 'array',
              of: [{ type: 'string' }],
              readOnly: true,
              description:
                'Remembered by the master importer so future imports reuse this image without asking for the file again.',
            }),
            {
              name: 'alt',
              title: 'Image description',
              type: 'string',
              validation: (r) => r.required(),
            },
          ],
        }),
      ],
    }),
    ref('brand', 'brand', 'Brand'),
    refs('categories', 'clothingCategory', 'Clothing categories'),
    defineField({ name: 'size', title: 'Label size', type: 'string' }),
    defineField({
      name: 'condition',
      title: 'Condition',
      type: 'string',
      options: {
        list: [
          { title: 'New with tags — unworn, original tags attached', value: 'New with tags' },
          { title: 'New without tags — unworn, tags removed', value: 'New without tags' },
          { title: 'Excellent — minimal signs of wear', value: 'Excellent' },
          { title: 'Very good (legacy) — light signs of wear', value: 'Very good' },
          { title: 'Good — noticeable normal wear, usable', value: 'Good' },
          { title: 'Fair — significant wear or defects, disclose below', value: 'Fair' },
          { title: 'Satisfactory (legacy) — significant wear, usable', value: 'Satisfactory' },
        ],
      },
      description:
        'Confirm condition yourself. Images cannot authenticate designer items. Existing condition values are preserved.',
    }),
    defineField({
      name: 'styleModel',
      title: 'Style / model name',
      type: 'string',
      validation: (r) => r.max(200),
    }),
    defineField({
      name: 'material',
      title: 'Material (confirmed from label when possible)',
      type: 'string',
      validation: (r) => r.max(300),
    }),
    defineField({
      name: 'measurements',
      title: 'Measurements (optional; include units)',
      type: 'text',
      rows: 3,
      validation: (r) => r.max(2000),
    }),
    defineField({
      name: 'wearNotes',
      title: 'Defects and wear notes',
      type: 'text',
      rows: 3,
      description:
        'Public item details. Private costs and pricing history live in the pricing assistant, never here.',
      validation: (r) => r.max(2000),
    }),
    defineField({
      name: 'labelDefectPhotos',
      title: 'Additional label and defect photos (public assets)',
      type: 'array',
      validation: (r) => r.max(8),
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Image description',
              type: 'string',
              validation: (r) => r.required(),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'masterInventorySku',
      title: 'Master inventory identity',
      type: 'string',
      readOnly: true,
      description:
        'Stable SKU association set by the master CSV importer. Keep the CSV SKU stable across both stores.',
    }),
    ...(['poshmark', 'vinted'] as const).map((platform) =>
      defineField({
        name: `${platform}Price`,
        title: `${platform === 'poshmark' ? 'Poshmark' : 'Vinted'} price (master inventory)`,
        type: 'object',
        readOnly: true,
        hidden: ({ document }) => document?.shoppingSection === 'finds',
        description:
          'Price from your master CSV. Blank cells preserve the last stored value. The selected primary marketplace also updates Current listing price.',
        fields: [
          defineField({
            name: 'amount',
            title: 'Asking price',
            type: 'number',
            validation: (r) => r.required().min(0),
          }),
          currency('currency', 'Currency'),
        ],
      }),
    ),
    defineField({
      name: 'listingPrice',
      title: 'Current listing price',
      type: 'number',
      validation: (r) => r.min(0),
    }),
    currency('currency', 'Listing currency'),
    defineField({
      name: 'availability',
      title: 'Availability (last known)',
      type: 'string',
      initialValue: 'available',
      description:
        'Legacy/import availability. When Sale Status is assigned, it controls this field; change Sale Status above.',
      readOnly: ({ document }) =>
        ['available', 'sold'].includes(String(document?.saleStatus || '')),
      options: { list: ['available', 'reserved', 'sold', 'unknown'] },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'vintedUrl',
      title: 'External Vinted listing',
      type: 'url',
      hidden: ({ document }) => document?.shoppingSection === 'finds',
      validation: (r) =>
        r.custom((v) => (!v || vintedUrl(v) ? true : 'Enter an HTTPS Vinted /items/ listing URL.')),
    }),
    defineField({
      name: 'poshmarkUrl',
      title: 'External Poshmark listing',
      type: 'url',
      description: 'Imported listing URL. Purchase link above can provide a manual override.',
      hidden: ({ document }) => document?.shoppingSection === 'finds',
      validation: (rule) =>
        rule.custom((value) =>
          !value || poshmarkUrl(value) ? true : 'Use an HTTPS Poshmark /listing/ URL.',
        ),
    }),
    defineField({ name: 'externalListingId', title: 'External listing ID', type: 'string' }),
    defineField({
      name: 'dataSource',
      title: 'Data source',
      type: 'string',
      initialValue: 'manual',
      options: { list: ['manual', 'import'] },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'importSource',
      title: 'Authorized import source key',
      type: 'string',
      description:
        'Used with external listing ID for stable matching. Leave empty for manual products.',
    }),
    defineField({
      name: 'importEnabled',
      title: 'Allow listing updates from imports',
      type: 'boolean',
      initialValue: false,
      description:
        'Switch off to protect manually curated listing fields. Imports never change photos, title, description, or review links after creation.',
    }),
    defineField({
      name: 'lastSuccessfullyCheckedAt',
      title: 'Last successfully checked',
      type: 'datetime',
    }),
    ref('relatedReview', 'review', 'Related review'),
  ],
  validation: (r) =>
    r.custom((d) => {
      if (d?.saleStatus && d.saleStatus !== d.availability)
        return 'Sale Status and listing availability must agree. Re-select Sale Status to synchronize them.';
      if (d?.listingPrice !== undefined && !d.currency) return 'Select the listing currency.';
      if (d?.shoppingSection === 'finds' && (!d.purchaseUrl || !d.retailer))
        return 'Curated finds need a purchase link and retailer name.';
      if (d?.newPurchaseUrl && !d.newRetailer) return 'Add the shop-new retailer name.';
      if (
        d?.slug &&
        typeof d.slug === 'object' &&
        'current' in d.slug &&
        ['closet', 'finds'].includes(String(d.slug.current))
      )
        return 'Choose a slug other than closet or finds; these are shopping section routes.';
      return true;
    }),
});
const blog = defineType({
  name: 'blogPost',
  title: 'Blog post',
  type: 'document',
  fields: [
    ...articleFields,
    refs('categories', 'blogCategory', 'Blog categories'),
    refs('relatedReviews', 'review', 'Related reviews'),
    refs('relatedProducts', 'product', 'Related closet products'),
  ],
});
const named = (name: string, label: string) =>
  defineType({ name, title: label, type: 'document', fields: [title, slug] });
const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'bio', title: 'Short biography', type: 'text' }),
    image('photo', 'Portrait'),
  ],
});
const requestFields = [
  defineField({ name: 'requestTitle', title: 'Request banner heading', type: 'string' }),
  defineField({
    name: 'requestIntro',
    title: 'Request banner introduction',
    type: 'text',
    rows: 2,
  }),
  image('requestImage', 'Request banner photo'),
];
const homepage = defineType({
  name: 'homepage',
  title: 'Homepage',
  type: 'document',
  fields: [
    defineField({ name: 'heroLine1', title: 'Hero first line', type: 'string' }),
    defineField({ name: 'heroEmphasis', title: 'Highlighted hero word', type: 'string' }),
    defineField({ name: 'heroLine2', title: 'Hero final words', type: 'string' }),
    defineField({
      name: 'heroScriptAccent',
      title: 'Hero script phrase (optional)',
      type: 'string',
      description:
        'Exact short phrase from the hero emphasis; defaults to questionable. Use script for large accents only.',
      validation: (rule) => rule.max(40),
    }),
    defineField({ name: 'heroIntro', title: 'Hero introduction', type: 'text', rows: 2 }),
    image('heroBack', 'Hero outfit photo'),
    image('heroFront', 'Hero detail photo'),
    defineField({ name: 'aboutHeading', title: 'About teaser heading', type: 'string' }),
    defineField({ name: 'aboutIntro', title: 'About teaser copy', type: 'text', rows: 3 }),
    image('aboutImage', 'About teaser photo'),
    url('videoUrl', 'Homepage video URL'),
    defineField({ name: 'videoTranscript', title: 'Video transcript', type: 'text' }),
    defineField({ name: 'videoCaptionsUrl', title: 'English captions path', type: 'string' }),
    ...requestFields,
  ],
  validation: (r) =>
    r.custom((d) =>
      d?.videoUrl && (!d.videoTranscript || !d.videoCaptionsUrl)
        ? 'Homepage video needs transcript and captions.'
        : true,
    ),
});
const about = defineType({
  name: 'aboutPage',
  title: 'About page',
  type: 'document',
  fields: [
    title,
    defineField({ name: 'intro', title: 'Page introduction', type: 'text' }),
    defineField({ name: 'eyebrow', title: 'Short introduction label', type: 'string' }),
    defineField({ name: 'heading', title: 'Biography heading', type: 'string' }),
    defineField({
      name: 'paragraphs',
      title: 'Biography paragraphs',
      type: 'array',
      of: [{ type: 'text' }],
      validation: (r) => r.max(6),
    }),
    image('portrait', 'Portrait'),
    {
      ...image('shannequinImage', 'Shannequin full-body photograph'),
      description:
        'Shared by the homepage and every review’s Shannequin panel. Use a full-body transparent cutout; the original proportions are preserved.',
    },
    defineField({
      name: 'shannequinMeasurements',
      title: 'Shannequin measurements',
      type: 'object',
      description:
        'Enter actual measurements only. The field keys identify each area permanently. Missing values display “Measurement coming soon”. Inches and centimeters are converted automatically.',
      fields: measurementAreas.map((area) =>
        defineField({
          name: area.id,
          title: area.label,
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              initialValue: area.label,
              validation: (r) => r.max(24),
            }),
            defineField({
              name: 'value',
              title: 'Measurement',
              type: 'number',
              validation: (r) => r.positive(),
            }),
            defineField({
              name: 'unit',
              title: 'Source unit',
              type: 'string',
              initialValue: 'in',
              options: {
                list: [
                  { title: 'Inches', value: 'in' },
                  { title: 'Centimeters', value: 'cm' },
                ],
              },
              validation: (r) =>
                r.custom((unit, context) =>
                  typeof (context.parent as { value?: number })?.value === 'number' &&
                  !['in', 'cm'].includes(String(unit))
                    ? 'Choose the source unit for this measurement.'
                    : true,
                ),
            }),
            defineField({
              name: 'description',
              title: 'What was measured',
              type: 'text',
              rows: 2,
              description:
                area.id === 'arm'
                  ? 'Specify upper-arm circumference or arm length; these are different measurements.'
                  : 'Briefly describe where and how this measurement was taken.',
              validation: (r) => r.max(180),
            }),
          ],
        }),
      ),
    }),
    defineField({
      name: 'promises',
      title: 'What readers will find here (three items)',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            title,
            defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
          ],
        }),
      ],
      validation: (r) => r.length(3),
    }),
    ...requestFields,
  ],
});
const settings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({
      name: 'leadModal',
      title: 'Marketing lead modal',
      type: 'object',
      fields: [
        defineField({
          name: 'enabled',
          title: 'Turn on Lead Modal',
          type: 'boolean',
          initialValue: false,
        }),
        defineField({
          name: 'eyebrow',
          title: 'Eyebrow',
          type: 'string',
          initialValue: 'Exclusive Offer',
          validation: (r) => r.max(60),
        }),
        defineField({
          name: 'headline',
          title: 'Headline',
          type: 'string',
          initialValue: 'Get 15% Off your first order from my closet!',
          validation: (r) => r.max(160),
        }),
        defineField({
          name: 'copy',
          title: 'Copy',
          type: 'text',
          rows: 3,
          initialValue: "Cute & cheap, you can't go wrong!",
          validation: (r) => r.max(1000),
        }),
        defineField({
          name: 'cta',
          title: 'CTA',
          type: 'string',
          initialValue: 'Get my 15% off',
          validation: (r) => r.max(80),
        }),
        image('image', 'Column 2 image'),
      ],
      validation: (r) =>
        r.custom((value) =>
          value?.enabled && !(value.image as { asset?: unknown } | undefined)?.asset
            ? 'Add an image before enabling the lead modal.'
            : true,
        ),
    }),
    defineField({
      name: 'socials',
      title: 'Social profiles',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'platform',
              title: 'Platform',
              type: 'string',
              options: { list: ['Instagram', 'Pinterest', 'YouTube', 'TikTok', 'Facebook'] },
              validation: (r) => r.required(),
            }),
            url('url', 'Profile URL'),
          ],
        }),
      ],
      validation: (r) => r.max(5),
    }),
    defineField({
      ...url('vintedShopUrl', 'Vinted shop URL'),
      validation: (rule) =>
        rule.custom((value) =>
          !value || closetShopUrl(value, 'vinted')
            ? true
            : 'Use your HTTPS Vinted /member/ profile URL.',
        ),
    }),
    defineField({
      ...url('poshmarkShopUrl', 'Poshmark closet URL'),
      validation: (rule) =>
        rule.custom((value) =>
          !value || closetShopUrl(value, 'poshmark')
            ? true
            : 'Use your HTTPS Poshmark /closet/username URL.',
        ),
    }),
    defineField({
      ...url('reviewWishlistUrl', 'My Review Wishlist URL'),
      description:
        'Optional full HTTPS view-only link to your Amazon review wishlist. Enables the gifting option in Request a Review. Configure delivery details on Amazon, not here.',
    }),
    defineField({
      name: 'contactEmail',
      title: 'Contact email',
      type: 'string',
      validation: (r) =>
        r.custom((v) =>
          !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? true : 'Enter an email address.',
        ),
    }),
    defineField({ name: 'contactDetails', title: 'Shared contact details', type: 'text' }),
    defineField({ name: 'defaultSeo', title: 'Default SEO', type: 'seo' }),
  ],
});
export const schemaTypes = [
  seo,
  body,
  review,
  product,
  blog,
  author,
  named('clothingCategory', 'Clothing category'),
  named('brand', 'Brand'),
  named('blogCategory', 'Blog category'),
  homepage,
  about,
  settings,
];
export const singletonTypes = new Set(['homepage', 'aboutPage', 'siteSettings']);
// Validation uses allowlisted protocols; no editor-supplied URL is fetched by the server.
void safeExternal;
