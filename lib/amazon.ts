import { stegaClean } from 'next-sanity';
import type { DocumentContent, Settings } from './types';
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
