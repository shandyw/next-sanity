import { amazonProduct } from './review-wishlist';

/** Identity from an Amazon product link; no network request or short-link resolution. */
export function asinFromAmazonUrl(value?: string): string | undefined {
  return amazonProduct(value)?.asin;
}

export function findAsin(value: { asin?: string; amazonUrl?: string; affiliateUrl?: string }) {
  return (
    value.asin?.trim().toUpperCase() ||
    asinFromAmazonUrl(value.amazonUrl) ||
    asinFromAmazonUrl(value.affiliateUrl)
  );
}

export function isAmazonProductLink(value?: string) {
  return Boolean(amazonProduct(value));
}

/** Fill only an empty ASIN field; a manually entered identity always wins. */
export function asinToAutofill(url: string, currentAsin?: string): string | undefined {
  return currentAsin?.trim() ? undefined : asinFromAmazonUrl(url);
}
