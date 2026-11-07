import { defineArrayMember, defineField, defineType } from 'sanity';
import { generateSeoSlug } from '../seo-slug';

export const lookOccasions = [
  { title: 'Date Night', value: 'dateNight' },
  { title: 'Weekend Casual', value: 'weekendCasual' },
  { title: 'Workwear', value: 'workwear' },
  { title: 'Vacation', value: 'vacation' },
  { title: 'Everyday', value: 'everyday' },
  { title: 'Special Occasion', value: 'specialOccasion' },
] as const;

type LookItem = { find?: { _ref?: string }; hotspot?: { x?: number; y?: number } };
type LookImage = { image?: unknown };

const lookImageSources = [
  { title: 'My original photograph', value: 'original' },
  { title: 'Separately licensed / authorized photograph', value: 'licensed' },
  { title: 'AI-generated styling concept', value: 'aiGenerated' },
];

export const lookImageEntry = defineType({
  name: 'lookImageEntry',
  title: 'Look image',
  type: 'object',
  fields: [
    defineField({ name: 'image', title: 'Image', type: 'image', options: { hotspot: true } }),
    defineField({
      name: 'alt',
      title: 'Image description (use for alt text)',
      type: 'string',
      validation: (rule) =>
        rule.custom((value, context) =>
          !(context.parent as LookImage | undefined)?.image || value?.trim()
            ? true
            : 'Describe the image for alt text.',
        ),
    }),
    defineField({
      name: 'sourceKind',
      title: 'Image source',
      type: 'string',
      options: { list: lookImageSources },
      validation: (rule) =>
        rule.custom((value, context) =>
          !(context.parent as LookImage | undefined)?.image ||
          lookImageSources.some((source) => source.value === value)
            ? true
            : 'Choose an image source.',
        ),
    }),
    defineField({
      name: 'fashionModel',
      title: 'AI Fashion Model identity (optional)',
      type: 'reference',
      to: [{ type: 'aiFashionModel' }],
      hidden: ({ parent }) =>
        (parent as { sourceKind?: string } | undefined)?.sourceKind !== 'aiGenerated',
      description: 'Preserves the selected fictional model identity for future reproducibility.',
    }),
  ],
  preview: {
    select: { media: 'image', source: 'sourceKind' },
    prepare: ({ media, source }) => ({
      title: source === 'aiGenerated' ? 'AI styling concept' : 'Look photograph',
      media,
    }),
  },
});

export const look = defineType({
  name: 'look',
  title: 'Shop the Look',
  type: 'document',
  groups: [
    { name: 'story', title: 'Story', default: true },
    { name: 'items', title: 'Shoppable items' },
    { name: 'images', title: 'Images' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Look title',
      type: 'string',
      group: 'story',
      validation: (r) => r.required().max(160),
    }),
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      group: 'story',
      options: { source: 'title', maxLength: 74, slugify: generateSeoSlug },
      description: 'Generate a short slug from about 3–5 core words, under 75 characters.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'description',
      title: 'Editorial description',
      type: 'text',
      rows: 4,
      group: 'story',
      validation: (r) => r.max(2000),
    }),
    defineField({
      name: 'occasion',
      title: 'Occasion / style',
      type: 'string',
      group: 'story',
      options: { list: [...lookOccasions] },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Publication date',
      type: 'datetime',
      group: 'story',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'seo', title: 'Search and sharing', type: 'seo', group: 'story' }),
    defineField({
      name: 'items',
      title: 'Finds in outfit order',
      type: 'array',
      group: 'items',
      description: 'Optional. Add Finds when you want this Look to have shoppable items.',
      of: [
        defineArrayMember({
          type: 'object',
          title: 'Outfit item',
          fields: [
            defineField({
              name: 'find',
              title: 'Find',
              type: 'reference',
              to: [{ type: 'find' }],
              validation: (r) => r.required(),
              description:
                'Select an existing Find; its name, image, ASIN and Amazon link remain on that Find.',
            }),
            defineField({
              name: 'role',
              title: 'Legacy garment role',
              type: 'string',
              hidden: true,
            }),
            defineField({
              name: 'placementRole',
              title: 'Place in this Look',
              type: 'string',
              options: {
                layout: 'radio',
                list: [
                  { title: 'Essential — Build the Look', value: 'essential' },
                  { title: 'Alternative — Make It Your Own', value: 'alternative' },
                ],
              },
              initialValue: 'essential',
              description: 'Existing items without a selection appear as essential pieces.',
            }),
            defineField({
              name: 'stylingNote',
              title: 'Styling note for this Look',
              type: 'text',
              rows: 3,
              description: 'A concise styling idea, not an unverified claim about fit or quality.',
              validation: (r) => r.max(240),
            }),
            defineField({
              name: 'hotspot',
              title: 'Position on cover image (optional)',
              type: 'object',
              description:
                'Percent from the left/top of the image. The hotspot links to this item’s Find.',
              fields: [
                defineField({
                  name: 'x',
                  title: 'Horizontal %',
                  type: 'number',
                  validation: (r) => r.required().min(0).max(100),
                }),
                defineField({
                  name: 'y',
                  title: 'Vertical %',
                  type: 'number',
                  validation: (r) => r.required().min(0).max(100),
                }),
              ],
            }),
          ],
          preview: {
            select: {
              title: 'find.title',
              role: 'placementRole',
              legacyRole: 'role',
              note: 'stylingNote',
              media: 'find.productImages.0.image',
            },
            prepare: ({ title, role, legacyRole, note, media }) => ({
              title: title || 'Choose a Find',
              subtitle: [role || legacyRole, note].filter(Boolean).join(' · '),
              media,
            }),
          },
        }),
      ],
      validation: (r) =>
        r.custom((value) => {
          const items = (value || []) as LookItem[];
          const refs = items.map((item) => item.find?._ref).filter(Boolean);
          return refs.length === new Set(refs).size ? true : 'Use each Find only once in a Look.';
        }),
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'lookImageEntry',
      group: 'images',
      description: 'Add an image description and choose its source before publishing the image.',
    }),
    defineField({
      name: 'variations',
      title: 'Outfit image variations',
      type: 'array',
      group: 'images',
      description:
        'Optional alternate Look images. The first complete image is used if no cover image is set.',
      of: [
        defineArrayMember({
          type: 'object',
          title: 'Variation',
          fields: [
            defineField({
              name: 'stylePreset',
              title: 'Style preset',
              type: 'string',
              options: { list: [...lookOccasions] },
            }),
            defineField({
              name: 'image',
              title: 'Variation image',
              type: 'lookImageEntry',
            }),
          ],
          preview: {
            select: {
              title: 'stylePreset',
              media: 'image.image',
            },
            prepare: ({ title, media }) => ({
              title: title || 'Outfit variation',
              media,
            }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      occasion: 'occasion',
      publishedAt: 'publishedAt',
      cover: 'coverImage.image',
    },
    prepare: ({ title, occasion, publishedAt, cover }) => ({
      title: title || 'Untitled Look',
      subtitle: `${lookOccasions.find((item) => item.value === occasion)?.title || 'Choose occasion'} · ${publishedAt ? 'Scheduled/published' : 'Draft'}`,
      media: cover,
    }),
  },
});
