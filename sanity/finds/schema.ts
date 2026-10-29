import { defineArrayMember, defineField, defineType, type ValidationContext } from 'sanity';
import { asinFromAmazonUrl, findAsin, isAmazonProductLink } from '../../lib/finds';
import { validAmazonAffiliateUrl } from '../../lib/amazon';
import { generateSeoSlug } from '../seo-slug';
import { FindAsinInput } from './FindAsinInput';
import { FindDocumentInput } from './FindDocumentInput';

type FindIdentity = { _id?: string; asin?: string; amazonUrl?: string; affiliateUrl?: string };

async function duplicateFindError(
  asin: string,
  ownId: string | undefined,
  context: ValidationContext,
): Promise<true | string> {
  try {
    const candidates = await context
      .getClient({ apiVersion: '2026-10-01' })
      .withConfig({ perspective: 'raw', useCdn: false })
      .fetch<FindIdentity[]>(
        '*[_type == "find" && !(_id in path("versions.**"))]{_id,asin,amazonUrl,affiliateUrl}',
      );
    const ownPublishedId = String(ownId || '').replace(/^drafts\./, '');
    return candidates.some(
      (other) =>
        other._id?.replace(/^drafts\./, '') !== ownPublishedId &&
        [
          other.asin?.trim().toUpperCase(),
          asinFromAmazonUrl(other.amazonUrl),
          asinFromAmazonUrl(other.affiliateUrl),
        ].includes(asin),
    )
      ? `Duplicate Find: ASIN ${asin} already belongs to another Find. Reuse the existing Find instead.`
      : true;
  } catch {
    return 'Could not check duplicate ASINs. Reconnect before publishing.';
  }
}

type FindImage = {
  image?: unknown;
  sourceKind?: string;
  sourceCredit?: string;
  approvalStatus?: string;
  selected?: boolean;
  prompt?: string;
  model?: string;
  generatedAt?: string;
};

const imageSourceChoices = [
  { title: 'My original photograph', value: 'original' },
  { title: 'Separately licensed / authorized photograph', value: 'licensed' },
  { title: 'AI-generated styling concept', value: 'aiGenerated' },
  { title: 'Rights not yet verified', value: 'unverified' },
];

export const editorialImageEntry = defineType({
  name: 'editorialImageEntry',
  title: 'Editorial image',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      validation: (r) =>
        r.custom((value, context) =>
          context.document?._type === 'look' || value ? true : 'Image is required for Finds.',
        ),
    }),
    defineField({
      name: 'alt',
      title: 'Image description',
      type: 'string',
      validation: (r) =>
        r.custom((value, context) =>
          context.document?._type === 'look' || (typeof value === 'string' && value.trim())
            ? true
            : 'Image description is required for Finds.',
        ),
    }),
    defineField({
      name: 'sourceKind',
      title: 'Image source',
      type: 'string',
      initialValue: 'unverified',
      options: { list: imageSourceChoices },
      validation: (r) => r.required(),
      description:
        'Only your own or separately authorized photographs may represent the exact product. AI images are styling concepts.',
    }),
    defineField({
      name: 'sourceCredit',
      title: 'License / source credit',
      type: 'string',
      hidden: ({ parent }) => (parent as FindImage | undefined)?.sourceKind !== 'licensed',
      validation: (r) =>
        r.custom((value, context) =>
          (context.parent as FindImage | undefined)?.sourceKind !== 'licensed' || value?.trim()
            ? true
            : 'Record the license or permission source.',
        ),
    }),
    defineField({
      name: 'prompt',
      title: 'Generation prompt',
      type: 'text',
      rows: 3,
      hidden: ({ parent }) => (parent as FindImage | undefined)?.sourceKind !== 'aiGenerated',
    }),
    defineField({
      name: 'model',
      title: 'Generation model',
      type: 'string',
      hidden: ({ parent }) => (parent as FindImage | undefined)?.sourceKind !== 'aiGenerated',
    }),
    defineField({
      name: 'generatedAt',
      title: 'Generated date',
      type: 'datetime',
      hidden: ({ parent }) => (parent as FindImage | undefined)?.sourceKind !== 'aiGenerated',
    }),
    defineField({
      name: 'approvalStatus',
      title: 'Editorial approval',
      type: 'string',
      initialValue: 'draft',
      options: {
        list: [
          { title: 'Draft — do not publish', value: 'draft' },
          { title: 'Approved', value: 'approved' },
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'selected',
      title: 'Selected image',
      type: 'boolean',
      initialValue: false,
      description: 'Choose at most one selected image in each image list.',
    }),
  ],
  validation: (r) =>
    r.custom((value, context) => {
      const image = value as FindImage | undefined;
      if (!image) return true;
      if (context?.document?._type === 'look' && !image.image) return true;
      if (image.sourceKind === 'unverified') return 'Confirm image rights before publication.';
      if (
        image.sourceKind === 'aiGenerated' &&
        (!image.prompt?.trim() || !image.model?.trim() || !image.generatedAt)
      )
        return 'Record the prompt, model and generation date for AI imagery.';
      if (image.approvalStatus !== 'approved')
        return 'Approve this image before publishing the document.';
      return true;
    }),
  preview: {
    select: { media: 'image', source: 'sourceKind', approval: 'approvalStatus' },
    prepare: ({ media, source, approval }) => ({
      title: source === 'aiGenerated' ? 'AI styling concept' : 'Product/editorial photograph',
      subtitle: approval === 'approved' ? 'Approved' : 'Draft',
      media,
    }),
  },
});

const imageList = (name: string, title: string, allowAi: boolean) =>
  defineField({
    name,
    title,
    type: 'array',
    of: [defineArrayMember({ type: 'editorialImageEntry' })],
    validation: (r) =>
      r.custom((value) => {
        const images = (value || []) as FindImage[];
        if (images.filter((image) => image.selected).length > 1) return 'Select only one image.';
        if (!allowAi && images.some((image) => image.sourceKind === 'aiGenerated'))
          return 'Use AI styling concepts in Editorial images, not Product photographs.';
        return true;
      }),
  });

export const find = defineType({
  name: 'find',
  title: 'Amazon Find',
  type: 'document',
  components: { input: FindDocumentInput },
  groups: [
    { name: 'product', title: 'Product', default: true },
    { name: 'experience', title: 'Experience' },
    { name: 'images', title: 'Images' },
    { name: 'editorial', title: 'Editorial' },
  ],
  fields: [
    defineField({
      name: 'amazonUrl',
      title: 'Amazon product URL',
      type: 'url',
      group: 'product',
      description:
        'Paste a full Amazon.com product or tagged link. The ASIN is detected from supported /dp/ and /gp/product/ URLs. No listing data is scraped.',
      validation: (r) =>
        r.custom(async (value, context) => {
          if (!value) return true;
          if (!isAmazonProductLink(value))
            return 'Use a full HTTPS Amazon.com product URL containing an ASIN.';
          return duplicateFindError(asinFromAmazonUrl(value)!, context.document?._id, context);
        }),
    }),
    defineField({
      name: 'title',
      title: 'Product name',
      type: 'string',
      group: 'product',
      validation: (r) => r.required().max(160),
    }),
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      group: 'product',
      options: { source: 'title', maxLength: 74, slugify: generateSeoSlug },
      description: 'Optional internal identifier. Finds do not have standalone public pages.',
    }),
    defineField({
      name: 'asin',
      title: 'ASIN (optional for full product URLs)',
      type: 'string',
      group: 'product',
      components: { input: FindAsinInput },
      description:
        'Full Amazon links supply this automatically for identity and duplicate checks. Enter it for an amzn.to affiliate link.',
      validation: (r) =>
        r.custom((value, context) => {
          if (!value) return true;
          if (!/^[A-Z0-9]{10}$/i.test(value.trim())) return 'Use a 10-character Amazon ASIN.';
          const document = context.document as FindIdentity | undefined;
          const parsed =
            asinFromAmazonUrl(document?.amazonUrl) || asinFromAmazonUrl(document?.affiliateUrl);
          return (
            !parsed ||
            parsed === value.trim().toUpperCase() ||
            'ASIN does not match the product URL.'
          );
        }),
    }),
    defineField({
      name: 'affiliateUrl',
      title: 'Approved Amazon affiliate URL',
      type: 'url',
      group: 'product',
      description:
        'Optional while drafting. Use your own verified Associate link; keep it separate from the original product link.',
      validation: (r) =>
        r.custom(async (value, context) => {
          if (!value) return true;
          if (
            !validAmazonAffiliateUrl(
              value,
              undefined,
              context.document?.affiliateShortLinkVerified === true,
            ) ||
            (!asinFromAmazonUrl(value) && new URL(value).hostname !== 'amzn.to')
          )
            return 'Use a tagged HTTPS Amazon.com URL, or verify an Amazon-generated amzn.to link.';
          const asin = asinFromAmazonUrl(value);
          return asin ? duplicateFindError(asin, context.document?._id, context) : true;
        }),
    }),
    defineField({
      name: 'affiliateShortLinkVerified',
      title: 'I verified this amzn.to link belongs to my Associate account',
      type: 'boolean',
      group: 'product',
      initialValue: false,
      hidden: ({ document }) =>
        !String(document?.affiliateUrl || '').startsWith('https://amzn.to/'),
    }),
    defineField({
      name: 'category',
      title: 'Clothing category',
      type: 'reference',
      to: [{ type: 'clothingCategory' }],
      group: 'product',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'experienceStatus',
      title: 'Experience with this item',
      type: 'string',
      group: 'experience',
      initialValue: 'notTested',
      options: {
        layout: 'radio',
        list: [
          { title: 'Not Tested', value: 'notTested' },
          { title: 'Received', value: 'received' },
          { title: 'Tested', value: 'tested' },
        ],
      },
      description:
        'Received means you have the item. Only Tested means you personally wore or tested it; a linked Review does not change this automatically.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'acquisitionSource',
      title: 'How I got it',
      type: 'string',
      group: 'experience',
      hidden: ({ document }) =>
        !['received', 'tested'].includes(String(document?.experienceStatus || '')),
      options: {
        list: [
          { title: 'Bought myself', value: 'selfPurchased' },
          { title: 'Reader gift', value: 'readerGift' },
          { title: 'Brand gift', value: 'brandGift' },
          { title: 'Other', value: 'other' },
        ],
      },
      description: 'Keep gift or sponsorship context for accurate disclosure.',
      validation: (r) =>
        r.custom((value, context) =>
          !['received', 'tested'].includes(String(context.document?.experienceStatus || '')) ||
          value
            ? true
            : 'Record how this item was acquired.',
        ),
    }),
    defineField({
      name: 'acquisitionNote',
      title: 'Acquisition detail',
      type: 'string',
      group: 'experience',
      hidden: ({ document }) => document?.acquisitionSource !== 'other',
      validation: (r) =>
        r.custom((value, context) =>
          context.document?.acquisitionSource !== 'other' || value?.trim()
            ? true
            : 'Describe the acquisition source.',
        ),
    }),
    imageList('productImages', 'Approved product photographs', false),
    imageList('editorialImages', 'Editorial photographs and AI styling concepts', true),
    defineField({
      name: 'description',
      title: 'Short original description',
      type: 'text',
      rows: 3,
      group: 'editorial',
      validation: (r) => r.max(1000),
      description:
        'Your own editorial context. Do not copy Amazon descriptions or claim firsthand fit before testing.',
    }),
    defineField({
      name: 'notes',
      title: 'Editorial notes',
      type: 'text',
      rows: 3,
      group: 'editorial',
      description:
        'Not used by the website. This dataset may be public: do not put secrets or private personal data here.',
    }),
  ].map((field) => ('group' in field ? field : { ...field, group: 'images' as const })),
  validation: (r) =>
    r.custom(async (document, context) => {
      if (!document) return true;
      const current = document as FindIdentity;
      if (!current.amazonUrl && !current.affiliateUrl)
        return 'Add an Amazon product URL or approved affiliate URL.';
      const sourceAsin = asinFromAmazonUrl(current.amazonUrl);
      const affiliateAsin = asinFromAmazonUrl(current.affiliateUrl);
      if (sourceAsin && affiliateAsin && sourceAsin !== affiliateAsin)
        return 'The original and affiliate URLs must point to the same ASIN.';
      const asin = findAsin(current);
      if (!asin) return 'Enter an ASIN when using an Amazon short link.';
      if (sourceAsin || affiliateAsin) return true;
      return duplicateFindError(asin, current._id, context);
    }),
  preview: {
    select: {
      title: 'title',
      asin: 'asin',
      amazonUrl: 'amazonUrl',
      affiliateUrl: 'affiliateUrl',
      status: 'experienceStatus',
      media: 'productImages.0.image',
    },
    prepare: ({ title, asin, amazonUrl, affiliateUrl, status, media }) => ({
      title: title || 'Untitled Find',
      subtitle: `${status === 'tested' ? 'Tested' : status === 'received' ? 'Received' : 'Not tested'} · ${findAsin({ asin, amazonUrl, affiliateUrl }) || 'ASIN needed'}`,
      media,
    }),
  },
});
