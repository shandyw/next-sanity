import 'server-only';
import { cache } from 'react';
import { draftMode } from 'next/headers';
import { stegaClean } from 'next-sanity';
import { ordinaryAmazonUrl, associatesActive, validAmazonAffiliateUrl } from './amazon';
import { configured, fetchContent } from './sanity';
import type { ContentPhoto, Settings } from './types';

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
  experienceStatus?: 'notTested' | 'received' | 'tested';
  amazonUrl?: string;
  affiliateUrl?: string;
  affiliateShortLinkVerified?: boolean;
  productImages?: ImageEntry[];
};

export type LookItem = {
  _key: string;
  role?: string;
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
  "coverImage":select(coverImage.approvalStatus == "approved" && coverImage.sourceKind in ["original","licensed","aiGenerated"] && (coverImage.sourceKind != "licensed" || defined(coverImage.sourceCredit)) => coverImage{image,alt,approvalStatus,sourceKind,sourceCredit,selected}),
  "variations":variations[image.selected == true && image.approvalStatus == "approved" && image.sourceKind in ["original","licensed","aiGenerated"] && (image.sourceKind != "licensed" || defined(image.sourceCredit))]{image{image,alt,approvalStatus,sourceKind,sourceCredit,selected}},
  items[]{_key,role,stylingNote,hotspot,
    "find":find->{_id,title,experienceStatus,amazonUrl,affiliateUrl,affiliateShortLinkVerified,
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

export function lookImage(look: Look) {
  const selected = look.variations?.find((variation) => variation.image?.selected);
  return approvedImage(look.coverImage) || approvedImage(selected?.image);
}

export function findImage(find?: LookFind) {
  const images = (find?.productImages || []).filter((entry) => entry.sourceKind !== 'aiGenerated');
  const selected = images.find((entry) => entry.selected && approvedImage(entry));
  return approvedImage(selected) || approvedImage(images.find((entry) => approvedImage(entry)));
}

export function findAmazonLink(find: LookFind, settings: Settings) {
  if (associatesActive(settings)) {
    const affiliate = validAmazonAffiliateUrl(
      find.affiliateUrl,
      settings.amazonAssociates?.tag,
      find.affiliateShortLinkVerified,
    );
    if (affiliate) return { href: affiliate, affiliate: true };
  }
  const ordinary = ordinaryAmazonUrl(find.amazonUrl || find.affiliateUrl);
  return ordinary ? { href: ordinary, affiliate: false } : undefined;
}
