import { catalogSource, closetStatus, catalogPlacements } from '@/lib/catalog';
import { amazonLink, isAmazonProduct, isAmazonUrl, experienceStatus } from '@/lib/amazon';
import { AffiliateDisclosure } from './AffiliateDisclosure';
import { ExternalLinkIcon } from './ExternalLinkIcon';
import { stegaClean } from 'next-sanity';
import type { DocumentContent, Settings } from '@/lib/types';
import { giftListUrl, vintedUrl, safeExternal, isStale } from '@/lib/urls';
export function ProductAction({
  product: d,
  settings = {},
  placement = 'product',
}: {
  product: DocumentContent;
  settings?: Settings;
  placement?: 'product' | 'collection' | 'review' | 'guide';
}) {
  const source = catalogSource(d),
    status = closetStatus(d),
    amazon = isAmazonProduct(d),
    link = amazon ? amazonLink(d, settings) : undefined;
  if (d.demo)
    return <div>{d.availability === 'available' && <button type="button" className="btn btn-accent" disabled>Shop on Vinted (sample)</button>}<p className="body-sm">Local sample only. No live listing or purchase is available.</p></div>;
  if (d.archived)
    return <p className="body-sm">This item is archived. Shopping links are unavailable.</p>;
  if (source === 'closet' && status === 'sold')
    return <p className="body-sm">Sold — no longer available to purchase.</p>;
  const links: { label: string; href?: string; affiliate?: boolean; amazon?: boolean }[] =
    source === 'closet'
      ? status === 'available'
        ? [
            {
              label: 'Shop on Vinted',
              href: vintedUrl(stegaClean(d.vintedUrl)) || vintedUrl(stegaClean(d.purchaseUrl)),
            },
          ]
        : []
      : [
          {
            label: amazon ? 'View on Amazon' : `Shop at ${stegaClean(d.retailer || 'retailer')}`,
            href: amazon
              ? link?.href
              : status !== 'sold' && status !== 'reserved'
                ? safeExternal(stegaClean(d.purchaseUrl))
                : undefined,
            affiliate: amazon ? link?.affiliate : d.affiliateLink,
            amazon,
          },
        ];
  if (source === 'closet' && d.newPurchaseUrl && status === 'available') {
    const extra = isAmazonUrl(d.newPurchaseUrl) ? amazonLink(d, settings, true) : undefined;
    links.push({
      label: extra ? 'View on Amazon' : `Shop new at ${stegaClean(d.newRetailer || 'retailer')}`,
      href:
        extra?.href ||
        (!isAmazonUrl(d.newPurchaseUrl) ? safeExternal(d.newPurchaseUrl) : undefined),
      affiliate: extra ? extra.affiliate : d.newAffiliateLink,
      amazon: !!extra,
    });
  }
  const gift = catalogPlacements(d).includes('reviewWishlist')
    ? giftListUrl(settings.reviewWishlistUrl)
    : undefined;
  return (
    <div className="product-purchase-options">
      {gift && (
        <div>
          <a className="btn btn-ghost" href={gift} target="_blank" rel="noopener noreferrer">
            View My Amazon Wishlist <ExternalLinkIcon />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
          <p className="body-sm">
            Use the wishlist gifting options. A normal product purchase does not send this item to
            me.
          </p>
        </div>
      )}
      {links
        .filter((l) => l.href)
        .map((l) => (
          <div key={l.label}>
            <AffiliateDisclosure active={!!l.amazon && !!l.affiliate} />
            {!l.amazon && l.affiliate && (
              <p className="body-sm">
                Affiliate link: I may earn a commission if you purchase through this link.
              </p>
            )}
            <a
              className="btn btn-accent"
              href={l.href}
              target="_blank"
              rel={l.affiliate ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
              data-amazon-product={l.amazon ? d.amazonAsin || d._id : undefined}
              data-placement={placement}
              data-experience={experienceStatus(d)}
            >
              {l.label}
              <ExternalLinkIcon />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </div>
        ))}
      {source === 'closet' && status !== 'available' && (
        <p>Availability is not confirmed. Purchase links are unavailable.</p>
      )}
      {source === 'closet' && status === 'available' && !links.some((l) => l.href) && (
        <p>Marketplace listing links are not available yet.</p>
      )}
      {source === 'closet' && isStale(d.lastSuccessfullyCheckedAt) && (
        <p className="body-sm">Availability has not been checked recently. Confirm the current listing on Vinted.</p>
      )}
    </div>
  );
}
