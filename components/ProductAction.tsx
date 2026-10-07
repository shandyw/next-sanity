import { stegaClean } from 'next-sanity';
import type { DocumentContent } from '@/lib/types';
import { vintedUrl, safeExternal, isStale } from '@/lib/urls';
import { shoppingSection } from '@/lib/shopping';

export function ProductAction({ product: d }: { product: DocumentContent }) {
  const finds = shoppingSection(d) === 'finds';
  if (d.demo)
    return (
      <div>
        {d.availability === 'available' && (
          <button className="btn btn-accent" type="button" disabled>
            Buy on Vinted (sample)
          </button>
        )}
        <p className="body-sm">Local sample only. No live listing or purchase is available.</p>
      </div>
    );
  const status = stegaClean(d.availability);
  const primary = finds ? safeExternal(d.purchaseUrl) : vintedUrl(d.purchaseUrl || d.vintedUrl);
  const additional = !finds ? safeExternal(d.newPurchaseUrl) : undefined;
  const canPurchase = finds ? status !== 'sold' && status !== 'reserved' : status === 'available';
  return (
    <div className="product-purchase-options">
      {canPurchase && primary && (
        <div>
          {d.affiliateLink && (
            <p className="body-sm">
              Affiliate link: I may earn a commission if you purchase through this link.
            </p>
          )}
          <a
            className="btn btn-accent"
            href={primary}
            target="_blank"
            rel={d.affiliateLink ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
          >
            {finds
              ? `Shop at ${stegaClean(d.retailer || 'retailer')}`
              : additional
                ? 'Buy mine on Vinted'
                : 'Buy on Vinted'}
          </a>
        </div>
      )}
      {additional && (
        <div>
          {d.newAffiliateLink && (
            <p className="body-sm">
              Affiliate link: I may earn a commission if you purchase through this link.
            </p>
          )}
          <a
            className="btn btn-ghost"
            href={additional}
            target="_blank"
            rel={d.newAffiliateLink ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
          >
            Shop new at {d.newRetailer || 'retailer'}
          </a>
        </div>
      )}
      {!finds && status !== 'sold' && isStale(d.lastSuccessfullyCheckedAt) && (
        <p className="body-sm">
          Availability has not been checked recently. Confirm the current listing on Vinted.
        </p>
      )}
      {finds && primary && (
        <p className="body-sm">Check current price, sizes, and availability at the retailer.</p>
      )}
    </div>
  );
}
