import { stegaClean } from 'next-sanity';
import type { ContentPhoto, DocumentContent, Settings } from './types';
import { safeExternal } from './urls';
export const AMAZON_DISCLOSURE = 'As an Amazon Associate I earn from qualifying purchases.';
export const validAssociateTag = (value?: string) =>
  /^[a-z0-9][a-z0-9-]{0,60}-20$/i.test(value || '');
export function isAmazonUrl(value?: string) {
  try {
    const host = new URL(stegaClean(value) || '').hostname.toLowerCase();
    return (
      /^(?:www\.)?amazon\.(?:com|ca|co\.uk|de|fr|it|es|com\.au|co\.jp)$/.test(host) ||
      host === 'amzn.to'
    );
  } catch {
    return false;
  }
}
export function isAmazonProduct(
  d: Pick<
    DocumentContent,
    'purchaseUrl' | 'retailer' | 'amazonAsin' | 'importedImageUrl' | 'catalogSource'
  >,
) {
  if (d.catalogSource === 'closet') return false;
  return Boolean(
    d.catalogSource === 'amazon' ||
    d.amazonAsin ||
    d.importedImageUrl ||
    isAmazonUrl(d.purchaseUrl) ||
    /^amazon(?:\.com)?$/i.test(stegaClean(d.retailer || '').trim()),
  );
}
export type Experience = 'tested' | 'mannequin' | 'curated';
export function experienceStatus(
  d: Pick<DocumentContent, 'experienceStatus' | 'personallyTried'>,
): Experience {
  const status = stegaClean(d.experienceStatus);
  return status === 'tested' || status === 'mannequin' || status === 'curated'
    ? status
    : d.personallyTried === true
      ? 'tested'
      : 'curated';
}
export function experienceLabel(d: Pick<DocumentContent, 'experienceStatus' | 'personallyTried'>) {
  return {
    tested: 'Personally tested',
    mannequin: 'Mannequin-only · Not personally worn',
    curated: 'Curated · Not personally tested',
  }[experienceStatus(d)];
}
export function associatesActive(settings: Settings = {}) {
  return (
    settings.amazonAssociates?.active === true &&
    validAssociateTag(stegaClean(settings.amazonAssociates.tag))
  );
}
/** Ordinary product URL has no Associate tag. A short link cannot be de-tagged safely. */
export function ordinaryAmazonUrl(source?: string, asin?: string) {
  try {
    const url = new URL(stegaClean(source) || '');
    if (
      url.protocol !== 'https:' ||
      !/^(www\.)?amazon\.com$/.test(url.hostname) ||
      url.username ||
      url.password
    )
      return /^[a-z0-9]{10}$/i.test(asin || '') ? `https://www.amazon.com/dp/${asin}` : undefined;
    const id = url.pathname.match(/\/(?:dp|gp\/product)\/([a-z0-9]{10})(?:\/|$)/i)?.[1];
    if (id) return `https://www.amazon.com/dp/${id}`;
    for (const key of ['tag', 'ascsubtag', 'linkCode', 'linkId', 'ref', 'ref_'])
      url.searchParams.delete(key);
    url.hash = '';
    return url.href;
  } catch {
    return /^[a-z0-9]{10}$/i.test(asin || '') ? `https://www.amazon.com/dp/${asin}` : undefined;
  }
}
export function validAmazonAffiliateUrl(value?: string, tag?: string, shortVerified = false) {
  const safe = safeExternal(stegaClean(value));
  if (!safe) return;
  const url = new URL(safe);
  if (url.hostname === 'amzn.to' && /^\/[A-Za-z0-9]+$/.test(url.pathname) && shortVerified)
    return safe;
  if (
    /^(www\.)?amazon\.com$/.test(url.hostname) &&
    validAssociateTag(url.searchParams.get('tag') || undefined) &&
    (!tag || url.searchParams.get('tag') === tag)
  )
    return safe;
}
export function amazonLink(d: DocumentContent, settings: Settings = {}, additional = false) {
  const source = additional ? d.newPurchaseUrl : d.purchaseUrl;
  const plain = ordinaryAmazonUrl(source, additional ? undefined : d.amazonAsin);
  // Gifts requested for the owner are deliberately ordinary links, never commission appeals.
  if (
    !associatesActive(settings) ||
    !(additional ? d.newAffiliateLink : d.affiliateLink) ||
    d.onReviewWishlist
  )
    return plain ? { href: plain, affiliate: false } : undefined;
  const tag = stegaClean(settings.amazonAssociates?.tag)!;
  const supplied = additional ? d.newAmazonAffiliateUrl : d.amazonAffiliateUrl;
  if (supplied) {
    const href = validAmazonAffiliateUrl(
      supplied,
      tag,
      additional ? d.newAmazonShortLinkVerified : d.amazonShortLinkVerified,
    );
    const sourceAsin = plain?.match(/\/dp\/([a-z0-9]{10})/i)?.[1]?.toUpperCase();
    const targetAsin = href
      ?.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([a-z0-9]{10})/i)?.[1]
      ?.toUpperCase();
    if (href && new URL(href).hostname !== 'amzn.to' && sourceAsin && sourceAsin !== targetAsin)
      return plain ? { href: plain, affiliate: false } : undefined;
    return href ? { href, affiliate: true } : plain ? { href: plain, affiliate: false } : undefined;
  }
  if (!plain) return;
  const url = new URL(plain);
  url.searchParams.set('tag', tag);
  return { href: url.href, affiliate: true };
}
export function productPhotos(d: DocumentContent): ContentPhoto[] {
  return (d.photos || []).filter((photo) => {
    if (!isAmazonProduct(d)) return true;
    return (
      photo.sourceKind === 'original' ||
      (photo.sourceKind === 'licensed' && Boolean(stegaClean(photo.sourceCredit)?.trim()))
    );
  });
}
export function productDescription(d: DocumentContent) {
  return isAmazonProduct(d)
    ? stegaClean(d.whyPicked || (d.contentReviewStatus === 'approved' ? d.description : '') || '')
    : d.description;
}
export function amazonEditorialIssues(d: DocumentContent): string[] {
  if (!isAmazonProduct(d)) return [];
  const issues: string[] = [];
  if (d.contentReviewStatus !== 'approved') issues.push('Editorial/content-source review needed');
  if (!stegaClean(d.whyPicked)?.trim()) issues.push('Add original Why I picked it commentary');
  if (!stegaClean(d.whatToCheck)?.trim())
    issues.push('Add original limitations / what shoppers should check');
  if (!d.editorialReviewedAt || !Number.isFinite(Date.parse(stegaClean(d.editorialReviewedAt))))
    issues.push('Add editorial review date');
  if (experienceStatus(d) !== 'curated' && !stegaClean(d.fitObservations)?.trim())
    issues.push('Describe the actual human/mannequin evidence');
  if ((d.photos?.length || 0) > productPhotos(d).length || d.importedImageUrl)
    issues.push('Unverified Amazon imagery retained but hidden');
  return issues;
}
export function productIndexable(d: DocumentContent) {
  if (d.demo || d.archived) return false;
  if (!isAmazonProduct(d)) return true;
  // No arbitrary word count: owner approves an original, useful editorial treatment explicitly.
  return (
    d.indexingIntent !== 'noindex' &&
    d.contentReviewStatus === 'approved' &&
    Boolean(stegaClean(d.whyPicked)?.trim()) &&
    Boolean(stegaClean(d.whatToCheck)?.trim()) &&
    Boolean(
      d.editorialReviewedAt && Number.isFinite(Date.parse(stegaClean(d.editorialReviewedAt))),
    ) &&
    (experienceStatus(d) === 'curated' || Boolean(stegaClean(d.fitObservations)?.trim()))
  );
}
