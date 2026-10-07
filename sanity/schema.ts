import { defineType, defineField, defineArrayMember } from 'sanity';
import { vintedUrl, safeExternal } from '../lib/urls';
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
    ...articleFields,
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
      name: 'shoppingSection',
      title: 'Shopping section',
      type: 'string',
      initialValue: 'closet',
      options: {
        list: [
          { title: 'My Vinted Closet', value: 'closet' },
          { title: 'Curated Finds', value: 'finds' },
        ],
      },
      description: 'Existing items without this field remain in My Vinted Closet.',
    }),
    defineField({
      ...url('purchaseUrl', 'Purchase link'),
      description:
        'Vinted listing for closet items; retailer product page for curated finds. Existing imported Vinted links below remain supported.',
      validation: (r) =>
        r.custom((value, context) =>
          !value ||
          (context.document?.shoppingSection === 'finds' ? safeExternal(value) : vintedUrl(value))
            ? true
            : 'Use an HTTPS retailer URL, or a Vinted /items/ listing for a closet item.',
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
      options: { list: ['New with tags', 'New without tags', 'Very good', 'Good', 'Satisfactory'] },
    }),
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
      initialValue: 'unknown',
      options: { list: ['available', 'reserved', 'sold', 'unknown'] },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'vintedUrl',
      title: 'External Vinted listing',
      type: 'url',
      validation: (r) =>
        r.custom((v) => (!v || vintedUrl(v) ? true : 'Enter an HTTPS Vinted /items/ listing URL.')),
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
    defineField({ name: 'heroIntro', title: 'Hero introduction', type: 'text', rows: 2 }),
    image('heroBack', 'Hero back photo'),
    image('heroFront', 'Hero front photo'),
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
    url('vintedShopUrl', 'Vinted shop URL'),
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
