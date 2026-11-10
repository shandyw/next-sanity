import { editorialImageEntry, find } from './finds/schema';
import { look, lookImageEntry } from './looks/schema';
import { generateSeoSlug } from './seo-slug';
import { measurementAreas } from '../lib/shannequin-measurements';
import { reviewSections } from '../lib/review-layout';
import { defineType, defineField, defineArrayMember } from 'sanity';
import { closetShopUrl, safeBackgroundVideoUrl, safeExternal, safeVideoUrl } from '../lib/urls';
import { amazonSettingsField } from './amazon-fields';
import { aiFashionModel } from './ai-fashion-model/schema';
import { fitCheck } from './fit-check/schema';
import { ReviewTitleInput } from './reviews/ReviewTitleInput';
const reviewCatalogFields = [
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

const slug = defineField({
  name: 'slug',
  title: 'URL slug',
  type: 'slug',
  options: { source: 'title', maxLength: 74, slugify: generateSeoSlug },
  description: 'Generate a short slug from about 3–5 core words, under 75 characters.',
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
const videoUrl = (
  label: string,
  description = 'Use an HTTPS URL or a site-relative path such as /videos/intro.mp4. Omit /public from paths to files in the public folder.',
) =>
  defineField({
    name: 'videoUrl',
    title: label,
    type: 'url',
    description,
    validation: (r) =>
      r
        .uri({ scheme: ['https'], allowRelative: true })
        .custom((value) =>
          !value || safeVideoUrl(value)
            ? true
            : 'Use an HTTPS URL or a path beginning with a single /.',
        ),
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
              defineField({
                name: 'affiliate',
                title: 'This is an affiliate recommendation',
                type: 'boolean',
                initialValue: false,
              }),
              url('affiliateUrl', 'Separate Amazon-generated affiliate URL (optional)'),
              defineField({
                name: 'shortLinkVerified',
                title: 'I verified this Amazon-generated short link and enrolled account',
                type: 'boolean',
                initialValue: false,
              }),
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
  defineField({
    name: 'experienceStatus',
    title: 'Experience behind this article (optional)',
    type: 'string',
    options: {
      list: [
        { title: 'Personally tested', value: 'tested' },
        { title: 'Mannequin-only demonstration', value: 'mannequin' },
        { title: 'Research / curated, not personally tested', value: 'curated' },
      ],
    },
    description:
      'State the evidence accurately. A mannequin demonstration cannot establish human comfort, movement or durability.',
  }),
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
    ...reviewCatalogFields,
    defineField({
      name: 'primaryFind',
      title: 'Primary Amazon Find (optional)',
      type: 'reference',
      to: [{ type: 'find' }],
      description:
        'Choose an existing Find only when this review covers that product. Linking a Find does not imply that you tested it; state your firsthand experience separately.',
    }),
    ...articleFields.filter((field) => field.name === 'experienceStatus'),
    defineField({
      ...title,
      description:
        'Prefilled once from the linked Find’s editorial display title when blank. You can edit it; changing the Find will not replace your title.',
      components: { input: ReviewTitleInput },
    }),
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
    ...articleFields.filter((field) =>
      !['experienceStatus', 'title', 'body', 'author'].includes(field.name),
    ),
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
        'Displays the shared Shannequin panel when supplied. Its image is managed once in About page → Shannequin full-body photograph.',
      validation: (r) => r.max(500),
    }),
    defineField({ name: 'fitCheck', title: 'Shannequin Fit Check', type: 'fitCheck' }),
    defineField({
      name: 'acquisitionSource',
      title: 'How did you get this item?',
      type: 'string',
      description:
        'Review-specific disclosure. Do not infer this from the Amazon link or the linked Find.',
      options: {
        list: [
          { title: 'Purchased myself', value: 'selfPurchased' },
          { title: 'Gifted by a brand', value: 'brandGift' },
          { title: 'Provided for review', value: 'providedForReview' },
          { title: 'Other', value: 'other' },
        ],
      },
    }),
    defineField({
      name: 'acquisitionNote',
      title: 'Acquisition detail (for Other)',
      type: 'string',
      hidden: ({ document }) => document?.acquisitionSource !== 'other',
      validation: (r) => r.max(160),
    }),
    defineField({
      name: 'finalVerdict',
      title: 'Final verdict (optional)',
      type: 'string',
      description: 'A short, manually written buying recommendation shown within Final Take.',
      validation: (r) => r.max(140),
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
    defineField({
      ...videoUrl(
        'Video URL (MP4, WebM, or YouTube)',
        'Paste a direct MP4/WebM URL, a regular YouTube watch URL, or a youtu.be share URL. For a file in public/videos, enter /videos/filename.mp4 (omit /public).',
      ),
      hidden: ({ document }) => !document?.format || document.format === 'written',
    }),
    defineField({
      name: 'videoCaptionsUrl',
      title: 'English captions (.vtt path on this site)',
      type: 'string',
      hidden: ({ document }) => !document?.format || document.format === 'written',
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
      hidden: ({ document }) => !document?.format || document.format === 'written',
      description: 'A readable text version of the video. Optional and does not block publishing.',
    }),
    defineField({ name: 'sizeWorn', title: 'Size worn', type: 'string' }),
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
          return 'Add copy to all four numbered sections.';
        if (!hasSections && !(Array.isArray(d.body) && d.body.length))
          return 'Write the four numbered sections.';
      }
      if (d && (d.format === 'video' || d.format === 'both') && !d.videoUrl)
        return 'Video reviews need a video URL.';
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
  ],
});
const named = (name: string, label: string, alphabetical = false) =>
  defineType({
    name,
    title: label,
    type: 'document',
    fields: [title, slug],
    ...(alphabetical
      ? {
          orderings: [
            {
              title: 'Title A–Z',
              name: 'titleAsc',
              by: [{ field: 'title', direction: 'asc' as const }],
            },
          ],
        }
      : {}),
  });
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
    image('heroBack', 'Homepage left photo — always visible'),
    image('heroFront', 'Homepage right photo — curtain reveal'),
    defineField({ name: 'aboutHeading', title: 'About teaser heading', type: 'string' }),
    defineField({ name: 'aboutIntro', title: 'About teaser copy', type: 'text', rows: 3 }),
    image('aboutImage', 'About teaser photo'),
    videoUrl('Homepage video URL'),
    defineField({ name: 'videoTranscript', title: 'Video transcript', type: 'text' }),
    defineField({ name: 'videoCaptionsUrl', title: 'English captions path', type: 'string' }),
    ...requestFields,
  ],
});
const measurementFields = measurementAreas.map((area) =>
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
);
const about = defineType({
  name: 'aboutPage',
  title: 'About page',
  type: 'document',
  fields: [
    title,
    defineField({ name: 'intro', title: 'Page introduction', type: 'text' }),
    defineField({
      name: 'heroVideoUrl',
      title: 'Hero background video URL',
      type: 'string',
      description:
        'Optional direct MP4 or WebM URL (HTTPS or a local /videos/ path). Replaces both hero images. The silent video plays only while visible.',
      validation: (rule) =>
        rule.custom((value) =>
          !value || safeBackgroundVideoUrl(value)
            ? true
            : 'Enter a direct HTTPS or local MP4/WebM video URL.',
        ),
    }),
    defineField({
      name: 'heroCopyTone',
      title: 'Hero copy panel',
      type: 'string',
      initialValue: 'light',
      options: {
        list: [
          { title: 'Light', value: 'light' },
          { title: 'Dark', value: 'dark' },
        ],
        layout: 'radio',
      },
      hidden: ({ document }) => !document?.heroVideoUrl,
    }),
    defineField({ name: 'eyebrow', title: 'Short introduction label', type: 'string' }),
    defineField({ name: 'heading', title: 'Biography heading', type: 'string' }),
    defineField({
      name: 'paragraphs',
      title: 'Biography paragraphs',
      type: 'array',
      of: [{ type: 'text' }],
      validation: (r) => r.max(6),
    }),
    {
      ...image('portrait', 'My full-body photograph'),
      description:
        'Used for the About page measurement hotspots. Use an uncropped full-body photo so the points align with your body.',
    },
    defineField({
      name: 'myMeasurements',
      title: 'My measurements',
      type: 'object',
      description:
        'Your public measurements for the About page portrait. Separate from Shannequin’s measurements. Missing values display “Measurement coming soon”.',
      fields: measurementFields,
    }),
    {
      ...image('shannequinImage', 'Shannequin full-body photograph'),
      description:
        'Shared by the About page, homepage, and every review’s Shannequin panel. Use a full-body transparent cutout; the original proportions are preserved.',
    },
    defineField({
      name: 'shannequinMeasurements',
      title: 'Shannequin measurements',
      type: 'object',
      description:
        'Enter actual measurements only. The field keys identify each area permanently. Missing values display “Measurement coming soon”. Inches and centimeters are converted automatically.',
      fields: measurementFields,
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
      name: 'reviewsHero',
      title: 'Reviews page hero',
      type: 'object',
      description: 'Choose the two photographs shown at the top of the Reviews page.',
      fields: [image('mainPhoto', 'Main photo'), image('smallPhoto', 'Second photo')],
    }),
    {
      ...image('supportHeroImage', 'Support page hero image'),
      description:
        'One landscape photograph for the Support page hero. Add an image description for accessibility.',
    },
    amazonSettingsField,
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
          !value || closetShopUrl(value) ? true : 'Use your HTTPS Vinted /member/ profile URL.',
        ),
    }),
    defineField({
      ...url('reviewWishlistUrl', 'My Review Wishlist URL'),
      description:
        'Your external Amazon gift wishlist. The Support the Reviews page links here; items are managed on Amazon.',
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
  editorialImageEntry,
  fitCheck,
  lookImageEntry,
  aiFashionModel,
  find,
  look,
  seo,
  body,
  review,
  blog,
  author,
  named('clothingCategory', 'Clothing category', true),
  named('brand', 'Brand'),
  named('blogCategory', 'Blog category'),
  homepage,
  about,
  settings,
];
export const singletonTypes = new Set(['homepage', 'aboutPage', 'siteSettings']);
// Validation uses allowlisted protocols; no editor-supplied URL is fetched by the server.
void safeExternal;
