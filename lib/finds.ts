function amazonProduct(value?: string) {
  try {
    const url = new URL(value || '');
    const asin = url.pathname
      .match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([a-z0-9]{10})(?:\/|$)/i)?.[1]
      .toUpperCase();
    if (
      url.protocol === 'https:' &&
      /^(www\.)?amazon\.com$/.test(url.hostname) &&
      !url.username &&
      !url.password &&
      asin
    )
      return { asin, url: `https://www.amazon.com/dp/${asin}` };
  } catch {}
}

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
