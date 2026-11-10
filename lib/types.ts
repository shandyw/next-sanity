import type { PortableTextBlock } from '@portabletext/types';
export interface ContentPhoto {
  asset?: { _ref?: string; url?: string };
  alt: string;
  caption?: string;
  sourceKind?: 'original' | 'licensed' | 'amazon' | 'unverified';
  sourceCredit?: string;
  crop?: { top: number; bottom: number; left: number; right: number };
  hotspot?: { x: number; y: number; width: number; height: number };
  demoSrc?: string;
}
export interface Named {
  _id: string;
  title: string;
  slug?: string;
}
export interface DocumentContent {
  _id: string;
  _type: 'review' | 'blogPost';
  title: string;
  slug: string;
  titleHighlight?: string;
  titleAccent?: string;
  reviewSections?: Partial<
    Record<
      import('./review-layout').ReviewSectionKey,
      { heading?: string; copy?: PortableTextBlock[] }
    >
  >;
  shannequinQuote?: string;
  fitCheck?: import('./fit-check').FitCheck;
  usualSize?: string;
  finalVerdict?: string;
  acquisitionSource?: 'selfPurchased' | 'brandGift' | 'providedForReview' | 'borrowed' | 'other';
  acquisitionNote?: string;
  experienceStatus?: 'tested' | 'mannequin' | 'curated';
  personallyTried?: boolean;
  readerProvided?: boolean;
  senderDisplayName?: string;
  senderNamePermission?: boolean;
  thankYouMessage?: string;
  primaryFind?: {
    _id: string;
    title: string;
    category?: { title?: string; slug?: string };
    experienceStatus?: 'notTested' | 'received' | 'tested';
    amazonUrl?: string;
    affiliateUrl?: string;
    affiliateShortLinkVerified?: boolean;
    linkStatus?: 'unchecked' | 'healthy' | 'needsReview' | 'unavailable';
  };
  excerpt?: string;
  description?: string;
  publishedAt?: string;
  createdAt?: string;
  featuredImage?: ContentPhoto;
  photos?: ContentPhoto[];
  body?: PortableTextBlock[];
  author?: { name: string };
  categories?: Named[];
  brand?: Named;
  sizeWorn?: string;
  format?: 'written' | 'video' | 'both';
  videoUrl?: string;
  transcript?: string;
  videoCaptionsUrl?: string;
  priceWhenReviewed?: number;
  reviewCurrency?: string;
  relatedReviews?: { title: string; slug: string }[];
  favorite?: boolean;
  demo?: boolean;
  seo?: { title?: string; description?: string; socialImage?: ContentPhoto };
}
export interface PageContent {
  heroLine1?: string;
  heroEmphasis?: string;
  heroLine2?: string;
  heroScriptAccent?: string;
  heroIntro?: string;
  heroBack?: ContentPhoto;
  heroFront?: ContentPhoto;
  heroVideoUrl?: string;
  heroCopyTone?: 'light' | 'dark';
  aboutImage?: ContentPhoto;
  aboutHeading?: string;
  aboutIntro?: string;
  videoUrl?: string;
  videoTranscript?: string;
  videoCaptionsUrl?: string;
  requestTitle?: string;
  requestIntro?: string;
  requestImage?: ContentPhoto;
  title?: string;
  intro?: string;
  eyebrow?: string;
  heading?: string;
  paragraphs?: string[];
  portrait?: ContentPhoto;
  myMeasurements?: import('./shannequin-measurements').ShannequinMeasurements;
  shannequinImage?: ContentPhoto;
  shannequinMeasurements?: import('./shannequin-measurements').ShannequinMeasurements;
  promises?: { title: string; description: string }[];
}
export interface Settings {
  reviewsHero?: { mainPhoto?: ContentPhoto; smallPhoto?: ContentPhoto };
  supportHeroImage?: ContentPhoto;
  amazonAssociates?: { active?: boolean; tag?: string; clickEventsEnabled?: boolean };
  leadModal?: {
    enabled?: boolean;
    eyebrow?: string;
    headline?: string;
    copy?: string;
    cta?: string;
    image?: ContentPhoto;
  };
  socials?: { platform: string; url: string }[];
  vintedShopUrl?: string;
  reviewWishlistUrl?: string;
  contactEmail?: string;
  contactDetails?: string;
  defaultSeo?: { title?: string; description?: string; socialImage?: ContentPhoto };
}
export type SearchParams = Record<string, string | string[] | undefined>;
