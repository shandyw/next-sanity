import { stegaClean } from 'next-sanity';
import type { DocumentContent, Settings } from '@/lib/types';
import { closetPlatform, closetPlatformName, shoppingSection } from '@/lib/shopping';
import { closetShopUrl, safeExternal } from '@/lib/urls';
import { ExternalLinkIcon } from './ExternalLinkIcon';

export function ClosetShopLink({
  product,
  settings = {},
}: {
  product: DocumentContent;
  settings?: Settings;
}) {
  const finds = shoppingSection(product) === 'finds';
  const platform = closetPlatform(product);
  const url = finds
    ? safeExternal(stegaClean(product.purchaseUrl))
    : closetShopUrl(
        stegaClean(platform === 'poshmark' ? settings.poshmarkShopUrl : settings.vintedShopUrl),
        platform,
      );
  const label = finds
    ? `Visit ${stegaClean(product.retailer || 'retailer')}`
    : `Visit my ${closetPlatformName(product)} closet`;
  if (product.demo) return <span className="body-sm">Local sample — no live closet link</span>;
  if (!url)
    return (
      <span className="body-sm">
        {finds ? 'Shop link unavailable' : `${closetPlatformName(product)} closet link coming soon`}
      </span>
    );
  return (
    <>
      <a
        className="text-link closet-shop-link"
        href={url}
        target="_blank"
        rel={
          finds && product.affiliateLink ? 'noopener noreferrer sponsored' : 'noopener noreferrer'
        }
      >
        <span>{label}</span>
        <ExternalLinkIcon />
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
      {finds && product.affiliateLink && (
        <span className="body-sm">Affiliate link: I may earn a commission if you purchase.</span>
      )}
    </>
  );
}
