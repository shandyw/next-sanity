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
type LookVariation = { image?: { selected?: boolean; approvalStatus?: string } };

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
              title: 'Outfit role',
              type: 'string',
              options: {
                list: ['Dress', 'Top', 'Bottom', 'Shoes', 'Bag', 'Accessories', 'Layer', 'Other'],
              },
            }),
            defineField({
              name: 'stylingNote',
              title: 'Styling note',
              type: 'string',
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
              role: 'role',
              note: 'stylingNote',
              media: 'find.productImages.0.image',
            },
            prepare: ({ title, role, note, media }) => ({
              title: title || 'Choose a Find',
              subtitle: [role, note].filter(Boolean).join(' · '),
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
      type: 'editorialImageEntry',
      group: 'images',
      description:
        'Choose an approved editorial image. An AI styling concept must be labeled as such and must not imply exact product photography.',
    }),
    defineField({
      name: 'variations',
      title: 'Outfit image variations',
      type: 'array',
      group: 'images',
      description:
        'Preparation for future image generation. Add only images you have rights to use; approve before publication.',
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
              type: 'editorialImageEntry',
            }),
          ],
          preview: {
            select: {
              title: 'stylePreset',
              media: 'image.image',
              approval: 'image.approvalStatus',
            },
            prepare: ({ title, media, approval }) => ({
              title: title || 'Outfit variation',
              subtitle: approval === 'approved' ? 'Approved' : 'Draft',
              media,
            }),
          },
        }),
      ],
      validation: (r) =>
        r.custom((value) => {
          const variations = (value || []) as LookVariation[];
          if (variations.filter((variation) => variation.image?.selected).length > 1)
            return 'Select only one outfit variation.';
          if (
            variations.some(
              (variation) =>
                variation.image?.selected && variation.image.approvalStatus !== 'approved',
            )
          )
            return 'Approve a variation before selecting it.';
          return true;
        }),
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
