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
export interface EditorialHeroMedia {
  layout?: 'portrait' | 'landscape';
  portraitMain?: ContentPhoto;
  portraitSecondary?: ContentPhoto;
  landscapePhoto?: ContentPhoto;
}
export interface Named {
  _id: string;
  title: string;
  slug?: string;
}
export interface DocumentContent {
  _id: string;
  sku?: string;
  catalogSource?: 'closet' | 'amazon';
  displayPlacements?: ('closet' | 'finds' | 'reviewWishlist')[];
  archived?: boolean;
  saleStatus?: 'available' | 'sold';
  reviewProgress?: 'not_requested' | 'wanted' | 'received' | 'in_progress' | 'reviewed';
  curatedReviewStatus?: 'not_reviewed' | 'reviewed';
  desiredSize?: string;
  desiredColor?: string;
  styleModel?: string;
  lastImportedAt?: string;
  reviewedProducts?: DocumentContent[];
  readerProvided?: boolean;
  senderDisplayName?: string;
  senderNamePermission?: boolean;
  thankYouMessage?: string;
  _type: 'review' | 'blogPost' | 'product';
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
  experienceStatus?: 'tested' | 'mannequin' | 'curated';
  whyPicked?: string;
  testedSize?: string;
  fitObservations?: string;
  sellerSpecifications?: string;
  whatToCheck?: string;
  editorialReviewedAt?: string;
  contentReviewStatus?: 'needs_review' | 'approved';
  indexingIntent?: 'noindex' | 'index';
  amazonAffiliateUrl?: string;
  amazonShortLinkVerified?: boolean;
  newAmazonAffiliateUrl?: string;
  newAmazonShortLinkVerified?: boolean;
  relatedGuides?: { title: string; slug: string }[];
  onReviewWishlist?: boolean;
  amazonAsin?: string;
  importedImageUrl?: string;
  priority?: 'high' | 'medium' | 'low';
  requestedQuantity?: number;
  receivedQuantity?: number;
  ctaLabel?: string;
  ctaProduct?: DocumentContent;
  primaryFind?: {
    _id: string;
    title: string;
    experienceStatus?: 'notTested' | 'received' | 'tested';
    amazonUrl?: string;
    affiliateUrl?: string;
    affiliateShortLinkVerified?: boolean;
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
  heroScriptAccent?: string;
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
  shannequinImage?: ContentPhoto;
  shannequinMeasurements?: import('./shannequin-measurements').ShannequinMeasurements;
  promises?: { title: string; description: string }[];
}
export interface Settings {
  closetHero?: EditorialHeroMedia;
  findsHero?: EditorialHeroMedia;
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
