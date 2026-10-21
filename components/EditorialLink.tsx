import type { ReactNode } from 'react';
import type { Settings, DocumentContent } from '@/lib/types';
import { amazonLink, isAmazonUrl, type Experience } from '@/lib/amazon';
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
  const product: DocumentContent = {
    _id: sourceId,
    _type: 'product',
    slug: '',
    title: '',
    purchaseUrl: href,
    affiliateLink: affiliate,
    amazonAffiliateUrl: affiliateHref,
    amazonShortLinkVerified: shortVerified,
  };
  const resolved = amazon ? amazonLink(product, settings) : undefined;
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
