import { defineField, defineType, type ValidationContext } from 'sanity';
import {
  fashionModelBodyShapes,
  fashionModelMeasurementLimits,
  fashionModelSizes,
} from '../../lib/ai-fashion-models';
import { generateSeoSlug } from '../seo-slug';

async function uniqueModelName(
  name: string | undefined,
  ownId: string | undefined,
  context: ValidationContext,
): Promise<true | string> {
  if (!name?.trim()) return true;
  try {
    const existing = await context
      .getClient({ apiVersion: '2026-10-01' })
      .withConfig({ perspective: 'raw', useCdn: false })
      .fetch<{ _id: string; name?: string }[]>(
        '*[_type == "aiFashionModel" && !(_id in path("versions.**"))]{_id,name}',
      );
    const ownCanonicalId = String(ownId || '').replace(/^drafts\./, '');
    return existing.some(
      (model) =>
        model._id.replace(/^drafts\./, '') !== ownCanonicalId &&
        model.name?.trim().toLowerCase() === name.trim().toLowerCase(),
    )
      ? 'Another AI Fashion Model already uses this name.'
      : true;
  } catch {
    return 'Could not check model-name uniqueness. Reconnect before publishing.';
  }
}

const appearanceFields = [
  ['skinTone', 'Skin tone'],
  ['hairColor', 'Hair color'],
  ['hairTexture', 'Hair texture'],
  ['hairstyle', 'Hairstyle'],
  ['eyeColor', 'Eye color'],
  ['ageAppearance', 'Approximate adult age appearance'],
  ['facialFeatures', 'Distinguishing facial features'],
  ['otherCharacteristics', 'Other visual characteristics'],
] as const;

export const aiFashionModel = defineType({
  name: 'aiFashionModel',
  title: 'AI Fashion Model',
  type: 'document',
  description:
    'Fictional AI-created editorial identity. Measurements guide visual concepts; they do not verify garment fit or imply firsthand testing.',
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'body', title: 'Body & appearance' },
    { name: 'reference', title: 'Approved reference' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Editorial model name',
      type: 'string',
      group: 'identity',
      validation: (rule) =>
        rule
          .required()
          .max(80)
          .custom((value, context) => uniqueModelName(value, context.document?._id, context)),
    }),
    defineField({
      name: 'slug',
      title: 'Stable identifier (optional)',
      type: 'slug',
      group: 'identity',
      options: { source: 'name', maxLength: 74, slugify: generateSeoSlug },
      description: 'Optional internal identifier. Keep it stable after an identity is in use.',
    }),
    defineField({
      name: 'description',
      title: 'Internal description',
      type: 'text',
      rows: 3,
      group: 'identity',
      description:
        'Private editorial notes. Never shown on public pages or included in generation queries.',
    }),
    defineField({
      name: 'active',
      title: 'Available for future image generation',
      type: 'boolean',
      initialValue: true,
      group: 'identity',
      description: 'Only active models with complete, approved references are eligible.',
    }),
    defineField({
      name: 'clothingSize',
      title: 'Editorial clothing size',
      type: 'string',
      group: 'body',
      options: { list: [...fashionModelSizes], layout: 'radio' },
      description: 'US size reference only; garment fit varies by brand and is never guaranteed.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'bodyShape',
      title: 'Body shape (optional)',
      type: 'string',
      group: 'body',
      options: { list: [...fashionModelBodyShapes] },
      description: 'Editorial description only. Never inferred automatically from measurements.',
    }),
    defineField({
      name: 'measurements',
      title: 'Body measurements (inches)',
      type: 'object',
      group: 'body',
      description: 'Visual-generation guidance, not verified product-fit measurements.',
      validation: (rule) => rule.required(),
      fields: (
        Object.entries(fashionModelMeasurementLimits) as [
          keyof typeof fashionModelMeasurementLimits,
          { min: number; max: number },
        ][]
      ).map(([name, { min, max }]) =>
        defineField({
          name,
          title: `${name.charAt(0).toUpperCase()}${name.slice(1)} (in)`,
          type: 'number',
          description:
            name === 'height'
              ? 'Total height in inches; for example, 66 means 5 ft 6 in.'
              : undefined,
          validation: (rule) => rule.required().min(min).max(max),
        }),
      ),
    }),
    defineField({
      name: 'appearance',
      title: 'Appearance details',
      type: 'object',
      group: 'body',
      description: 'Concise visual descriptors for a recognizable fictional identity.',
      fields: appearanceFields.map(([name, title]) =>
        defineField({ name, title, type: 'string', validation: (rule) => rule.max(180) }),
      ),
    }),
    defineField({
      name: 'identityPrompt',
      title: 'Reusable identity description',
      type: 'text',
      rows: 5,
      group: 'identity',
      description:
        'Describe stable appearance and body proportions. Avoid outfit, pose, scene, fit claims, or firsthand-testing claims.',
      validation: (rule) =>
        rule
          .required()
          .max(800)
          .custom((value) =>
            !value || value.trim().length >= 40
              ? true
              : 'Write at least 40 characters describing this model’s consistent identity.',
          ),
    }),
    defineField({
      name: 'referenceImage',
      title: 'Primary reference image',
      type: 'image',
      options: { hotspot: true },
      group: 'reference',
      description:
        'Editor-uploaded reference only. Sanity assets can be publicly accessible even while this document is a draft.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'referenceImageAlt',
      title: 'Reference image description (alt text)',
      type: 'string',
      group: 'reference',
      validation: (rule) => rule.required().max(240),
    }),
    defineField({
      name: 'referenceImageSource',
      title: 'Reference image source',
      type: 'string',
      group: 'reference',
      options: {
        list: [
          { title: 'AI-generated fictional reference', value: 'aiGenerated' },
          { title: 'Separately licensed / authorized photograph', value: 'licensed' },
        ],
      },
      description: 'Classify AI imagery distinctly from actual photography.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'referenceImageRights',
      title: 'Source and usage rights',
      type: 'text',
      rows: 3,
      group: 'reference',
      description:
        'Record the creator, license, or permission that allows editorial and AI-reference use.',
      validation: (rule) =>
        rule
          .required()
          .max(600)
          .custom((value) =>
            !value || value.trim() ? true : 'Describe the source and usage rights.',
          ),
    }),
    defineField({
      name: 'referenceImageDescription',
      title: 'Reference-image notes (optional)',
      type: 'text',
      rows: 2,
      group: 'reference',
      description: 'Describe details to preserve or avoid when future images are created.',
    }),
    defineField({
      name: 'referenceImageApproval',
      title: 'Reference-image editorial approval',
      type: 'string',
      group: 'reference',
      initialValue: 'draft',
      options: {
        list: [
          { title: 'Draft — not approved for generation', value: 'draft' },
          { title: 'Approved for generation', value: 'approved' },
        ],
      },
      validation: (rule) => rule.required(),
      description:
        'Approval is explicit. Publishing a model document alone never approves its reference image.',
    }),
  ],
  validation: (rule) =>
    rule.custom((document) =>
      !document || document.referenceImageApproval === 'approved'
        ? true
        : 'Approve the primary reference image before publishing this model.',
    ),
  preview: {
    select: {
      title: 'name',
      media: 'referenceImage',
      size: 'clothingSize',
      active: 'active',
      approval: 'referenceImageApproval',
    },
    prepare: ({ title, media, size, active, approval }) => ({
      title: title || 'Unnamed AI Fashion Model',
      subtitle: `${size ? `US ${size}` : 'Size needed'} · ${active === false ? 'Inactive' : 'Active'} · ${approval === 'approved' ? 'Reference approved' : 'Reference draft'}`,
      media,
    }),
  },
});
