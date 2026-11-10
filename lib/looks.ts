import 'server-only';
import { cache } from 'react';
import { draftMode } from 'next/headers';
import { stegaClean } from 'next-sanity';
import { configured, fetchContent } from './sanity';
import type { ContentPhoto } from './types';
export { findAmazonLink } from './find-amazon-link';

type ImageEntry = {
  image?: ContentPhoto;
  alt?: string;
  approvalStatus?: string;
  sourceKind?: string;
  sourceCredit?: string;
  selected?: boolean;
};

export type LookFind = {
  _id: string;
  title: string;
  editorialTitle?: string;
  description?: string;
  asin?: string;
  category?: { title?: string; slug?: string };
  experienceStatus?: 'notTested' | 'received' | 'tested';
  amazonUrl?: string;
  affiliateUrl?: string;
  affiliateShortLinkVerified?: boolean;
  linkStatus?: 'unchecked' | 'healthy' | 'needsReview' | 'unavailable';
  productImages?: ImageEntry[];
};

export type LookItem = {
  _key: string;
  role?: string;
  placementRole?: 'essential' | 'alternative';
  stylingNote?: string;
  hotspot?: { x?: number; y?: number };
  find?: LookFind;
};

export type Look = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  occasion?: string;
  publishedAt?: string;
  coverImage?: ImageEntry;
  variations?: { image?: ImageEntry }[];
  items?: LookItem[];
  seo?: { title?: string; description?: string; socialImage?: ContentPhoto };
};

export const lookOccasionLabels: Record<string, string> = {
  everyday: 'Everyday',
  weekendCasual: 'Casual',
  workwear: 'Workwear',
  dateNight: 'Date Night',
  vacation: 'Vacation',
  specialOccasion: 'Special Occasion',
};

export function lookOccasionLabel(value?: string) {
  return value ? lookOccasionLabels[stegaClean(value)] || value : 'Outfit';
}

const lookFields = `_id,title,"slug":slug.current,description,occasion,publishedAt,
  coverImage{image,alt,sourceKind},
  variations[]{image{image,alt,sourceKind}},
  items[]{_key,role,placementRole,stylingNote,hotspot,
    "find":find->{_id,title,editorialTitle,description,asin,"category":category->{title,"slug":slug.current},experienceStatus,amazonUrl,affiliateUrl,affiliateShortLinkVerified,linkStatus,
      "productImages":productImages[approvalStatus == "approved" && sourceKind in ["original","licensed"] && (sourceKind != "licensed" || defined(sourceCredit))]{image,alt,approvalStatus,sourceKind,sourceCredit,selected}}},
  seo{title,description,socialImage}`;

export const getLooks = cache(async (): Promise<Look[]> => {
  if (!configured) return [];
  const preview = (await draftMode()).isEnabled;
  return fetchContent<Look[]>(
    `*[_type == "look" && defined(slug.current) && ($preview || (defined(publishedAt) && publishedAt <= now()))]
      | order(publishedAt desc, _id asc){${lookFields}}`,
    { preview },
  );
});

export async function getLook(slug: string) {
  return (await getLooks()).find((look) => stegaClean(look.slug) === slug);
}

function approvedImage(entry?: ImageEntry): ContentPhoto | undefined {
  if (
    entry?.approvalStatus !== 'approved' ||
    !['original', 'licensed', 'aiGenerated'].includes(entry.sourceKind || '') ||
    (entry.sourceKind === 'licensed' && !entry.sourceCredit?.trim()) ||
    !entry.image?.asset?._ref ||
    !entry.alt?.trim()
  )
    return;
  return { ...entry.image, alt: entry.alt };
}

function displayableLookImage(entry?: ImageEntry): ContentPhoto | undefined {
  if (
    !entry?.image?.asset?._ref ||
    !entry.alt?.trim() ||
    !['original', 'licensed', 'aiGenerated'].includes(entry.sourceKind || '')
  )
    return;
  return { ...entry.image, alt: entry.alt };
}

export function lookImage(look: Look) {
  return (
    displayableLookImage(look.coverImage) ||
    look.variations?.map((variation) => displayableLookImage(variation.image)).find(Boolean)
  );
}

export function lookImageSource(look: Look) {
  const entry = displayableLookImage(look.coverImage)
    ? look.coverImage
    : look.variations?.find((variation) => displayableLookImage(variation.image))?.image;
  return entry?.sourceKind;
}

export function findImage(find?: LookFind) {
  const images = (find?.productImages || []).filter((entry) => entry.sourceKind !== 'aiGenerated');
  const selected = images.find((entry) => entry.selected && approvedImage(entry));
  return approvedImage(selected) || approvedImage(images.find((entry) => approvedImage(entry)));
}
