import type { PortableTextBlock } from '@portabletext/types';
export interface ContentPhoto {
  asset?: { _ref?: string; url?: string };
  alt: string;
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
  _type: 'review' | 'blogPost' | 'product';
  title: string;
  slug: string;
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
  size?: string;
  condition?: string;
  fitNotes?: string;
  format?: 'written' | 'video' | 'both';
  videoUrl?: string;
  transcript?: string;
  videoCaptionsUrl?: string;
  priceWhenReviewed?: number;
  reviewCurrency?: string;
  listingPrice?: number;
  currency?: string;
  availability?: 'available' | 'reserved' | 'sold' | 'unknown';
  vintedUrl?: string;
  shoppingSection?: 'closet' | 'finds';
  purchaseUrl?: string;
  retailer?: string;
  affiliateLink?: boolean;
  personallyTried?: boolean;
  availableSizes?: string[];
  priceMaintained?: boolean;
  newPurchaseUrl?: string;
  newRetailer?: string;
  newAffiliateLink?: boolean;
  lastSuccessfullyCheckedAt?: string;
  dataSource?: 'manual' | 'import';
  relatedReview?: { title: string; slug: string };
  products?: DocumentContent[];
  relatedReviews?: { title: string; slug: string }[];
  relatedProducts?: DocumentContent[];
  favorite?: boolean;
  demo?: boolean;
  seo?: { title?: string; description?: string; socialImage?: ContentPhoto };
}
export interface PageContent {
  heroLine1?: string;
  heroEmphasis?: string;
  heroLine2?: string;
  heroIntro?: string;
  heroBack?: ContentPhoto;
  heroFront?: ContentPhoto;
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
  promises?: { title: string; description: string }[];
}
export interface Settings {
  socials?: { platform: string; url: string }[];
  vintedShopUrl?: string;
  reviewWishlistUrl?: string;
  contactEmail?: string;
  contactDetails?: string;
  defaultSeo?: { title?: string; description?: string; socialImage?: ContentPhoto };
}
export type SearchParams = Record<string, string | string[] | undefined>;
