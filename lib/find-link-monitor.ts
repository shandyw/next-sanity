import { associatesActive, validAmazonAffiliateUrl } from './amazon';
import { asinFromAmazonUrl, isAmazonProductLink } from './finds';
import type { Settings } from './types';
import { stegaClean } from 'next-sanity';

export type LinkStatus = 'unchecked' | 'healthy' | 'needsReview' | 'unavailable';
export type MonitoredFind = {
  _id: string;
  _rev: string;
  amazonUrl?: string;
  affiliateUrl?: string;
  affiliateShortLinkVerified?: boolean;
  asin?: string;
  linkStatus?: LinkStatus;
  linkCheckResult?: string;
  linkLastCheckedAt?: string;
};
export type ReferencingLook = {
  _id: string;
  items?: { find?: { _ref?: string } }[];
};
export type LinkCheck = { status: Exclude<LinkStatus, 'unavailable'>; result: string };

const asinPattern = /^[A-Z0-9]{10}$/i;
const checkIntervalMs = 6 * 24 * 60 * 60 * 1000;

export function isFindUnavailable(status?: string) {
  return stegaClean(status) === 'unavailable';
}

export function referencedPublishedFindIds(looks: ReferencingLook[]) {
  return [
    ...new Set(
      looks.flatMap(
        (look) =>
          look.items
            ?.map((item) => item.find?._ref)
            .filter((id): id is string =>
              Boolean(id && !id.startsWith('drafts.') && !id.startsWith('versions.')),
            ) || [],
      ),
    ),
  ];
}

/** Checks only URL data. It never requests Amazon or infers product availability. */
export function checkFindLink(find: MonitoredFind, settings: Settings): LinkCheck {
  const productUrl = find.amazonUrl?.trim();
  const affiliateUrl = find.affiliateUrl?.trim();
  if (!productUrl && !affiliateUrl)
    return { status: 'needsReview', result: 'Missing Amazon product and affiliate URLs' };
  if (productUrl && !isAmazonProductLink(productUrl))
    return { status: 'needsReview', result: 'Invalid Amazon product URL' };
  if (find.asin && !asinPattern.test(find.asin.trim()))
    return { status: 'needsReview', result: 'Invalid ASIN' };

  const productAsin = asinFromAmazonUrl(productUrl);
  const affiliateAsin = asinFromAmazonUrl(affiliateUrl);
  const storedAsin = find.asin?.trim().toUpperCase();
  if (
    (storedAsin && productAsin && storedAsin !== productAsin) ||
    (storedAsin && affiliateAsin && storedAsin !== affiliateAsin) ||
    (productAsin && affiliateAsin && productAsin !== affiliateAsin)
  )
    return { status: 'needsReview', result: 'Product identifier mismatch' };

  if (affiliateUrl) {
    if (
      !validAmazonAffiliateUrl(
        affiliateUrl,
        associatesActive(settings) ? settings.amazonAssociates?.tag : undefined,
        find.affiliateShortLinkVerified,
      )
    )
      return {
        status: 'needsReview',
        result: associatesActive(settings)
          ? 'Invalid affiliate URL or missing expected tag'
          : 'Invalid Amazon affiliate URL',
      };
  } else if (associatesActive(settings)) {
    return { status: 'needsReview', result: 'Missing affiliate URL for active Associates account' };
  }

  if (affiliateUrl && new URL(affiliateUrl).hostname === 'amzn.to') {
    if (!storedAsin && !productAsin)
      return { status: 'needsReview', result: 'ASIN required for Amazon short link' };
    return {
      status: 'unchecked',
      result: 'Verified short-link format; destination and tag not checked',
    };
  }

  if (!productAsin && !affiliateAsin) {
    if (!storedAsin)
      return { status: 'needsReview', result: 'ASIN required for Amazon short link' };
    return {
      status: 'unchecked',
      result: 'Verified short-link format; destination and tag not checked',
    };
  }
  return {
    status: 'healthy',
    result: affiliateUrl
      ? 'URL format, affiliate tag and ASIN checks passed; stock not checked'
      : 'Product URL and ASIN checks passed; stock not checked',
  };
}

export function dueLinkUpdate(find: MonitoredFind, check: LinkCheck, now: Date) {
  if (find.linkStatus === 'unavailable') return false;
  const last = find.linkLastCheckedAt ? Date.parse(find.linkLastCheckedAt) : NaN;
  return (
    find.linkStatus !== check.status ||
    find.linkCheckResult !== check.result ||
    !Number.isFinite(last) ||
    now.getTime() - last >= checkIntervalMs
  );
}

export type MonitorStore = {
  loadLooks: () => Promise<ReferencingLook[]>;
  loadFinds: (ids: string[]) => Promise<MonitoredFind[]>;
  loadSettings: () => Promise<Settings>;
  patchFind: (find: MonitoredFind, check: LinkCheck, checkedAt: string) => Promise<void>;
};

function isRevisionConflict(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    (('statusCode' in error && error.statusCode === 409) ||
      ('status' in error && error.status === 409))
  );
}

export async function runFindLinkMonitor(store: MonitorStore, now = new Date()) {
  const [looks, settings] = await Promise.all([store.loadLooks(), store.loadSettings()]);
  const ids = referencedPublishedFindIds(looks);
  if (ids.length > 40)
    throw new Error('More than 40 referenced Finds; increase the bounded batch after review.');
  if (!ids.length) return { referenced: 0, checked: 0, updated: 0, skipped: 0, failed: 0 };
  const finds = await store.loadFinds(ids);
  const eligible = finds.filter(
    (find) => ids.includes(find._id) && !find._id.startsWith('drafts.'),
  );
  const found = new Set(eligible.map((find) => find._id));
  const result = {
    referenced: ids.length,
    checked: 0,
    updated: 0,
    skipped: 0,
    failed: ids.filter((id) => !found.has(id)).length,
  };
  for (let start = 0; start < eligible.length; start += 4) {
    await Promise.all(
      eligible.slice(start, start + 4).map(async (find) => {
        result.checked++;
        const check = checkFindLink(find, settings);
        if (!dueLinkUpdate(find, check, now)) {
          result.skipped++;
          return;
        }
        try {
          await store.patchFind(find, check, now.toISOString());
          result.updated++;
        } catch (error) {
          if (isRevisionConflict(error)) result.skipped++;
          else result.failed++;
        }
      }),
    );
  }
  return result;
}
