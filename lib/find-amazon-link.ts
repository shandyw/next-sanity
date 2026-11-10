import { associatesActive, ordinaryAmazonUrl, validAmazonAffiliateUrl } from './amazon';
import { isFindUnavailable } from './find-link-monitor';
import type { LookFind } from './looks';
import type { Settings } from './types';

/** Shared by Look and Review CTAs. Monitoring only suppresses a manually unavailable Find. */
export function findAmazonLink(find: LookFind, settings: Settings) {
  if (isFindUnavailable(find.linkStatus)) return;
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
