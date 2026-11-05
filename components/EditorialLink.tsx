import type { ReactNode } from 'react';
import type { Settings } from '@/lib/types';
import {
  associatesActive,
  isAmazonUrl,
  ordinaryAmazonUrl,
  validAmazonAffiliateUrl,
  type Experience,
} from '@/lib/amazon';
import { safeExternal } from '@/lib/urls';
export function EditorialLink({
  href,
  affiliate = false,
  affiliateHref,
  shortVerified = false,
  settings = {},
  sourceId,
  placement,
  children,
  experience = 'curated',
}: {
  href?: string;
  affiliate?: boolean;
  affiliateHref?: string;
  shortVerified?: boolean;
  settings?: Settings;
  sourceId: string;
  placement: 'review' | 'guide';
  children: ReactNode;
  experience?: Experience;
}) {
  const amazon = isAmazonUrl(href);
  const plain = amazon ? ordinaryAmazonUrl(href) : undefined;
  const active = amazon && affiliate && associatesActive(settings);
  const supplied = active
    ? validAmazonAffiliateUrl(affiliateHref, settings.amazonAssociates?.tag, shortVerified)
    : undefined;
  const sourceAsin = plain?.match(/\/dp\/([a-z0-9]{10})/i)?.[1]?.toUpperCase();
  const targetAsin = supplied
    ?.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([a-z0-9]{10})/i)?.[1]
    ?.toUpperCase();
  const validSupplied =
    supplied &&
    (new URL(supplied).hostname === 'amzn.to' || !sourceAsin || sourceAsin === targetAsin)
      ? supplied
      : undefined;
  const generated = active && !affiliateHref && plain ? new URL(plain) : undefined;
  if (generated) generated.searchParams.set('tag', settings.amazonAssociates!.tag!);
  const resolved = amazon
    ? validSupplied
      ? { href: validSupplied, affiliate: true }
      : generated
        ? { href: generated.href, affiliate: true }
        : plain
          ? { href: plain, affiliate: false }
          : undefined
    : undefined;
  const target = amazon ? resolved?.href : safeExternal(href);
  if (!target) return <>{children}</>;
  const productId =
    (
      href?.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([a-z0-9]{10})(?:\/|\?|$)/i)?.[1] ||
      resolved?.href.match(/\/dp\/([a-z0-9]{10})/i)?.[1]
    )?.toUpperCase() || sourceId;
  const sponsored = amazon ? resolved?.affiliate : affiliate;
  return (
    <>
      <a
        href={target}
        rel={sponsored ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}
        data-amazon-product={amazon ? productId : undefined}
        data-placement={placement}
        data-experience={experience}
      >
        {children}
        {amazon ? ' (Amazon)' : ''}
      </a>
      {sponsored && <span className="body-sm"> (paid link)</span>}
    </>
  );
}
