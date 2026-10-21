import { isAmazonProduct, amazonLink, experienceStatus } from '@/lib/amazon';
import { AffiliateDisclosure } from './AffiliateDisclosure';
import { stegaClean } from 'next-sanity';
import type { DocumentContent, Settings } from '@/lib/types';
import { shoppingSection } from '@/lib/shopping';
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
  const amazon = isAmazonProduct(product);
  const link = amazon ? amazonLink(product, settings) : undefined;
  const url = amazon
    ? link?.href
    : finds
      ? safeExternal(stegaClean(product.purchaseUrl))
      : closetShopUrl(stegaClean(settings.vintedShopUrl));
  const label = amazon
    ? 'View on Amazon'
    : finds
      ? `Visit ${stegaClean(product.retailer || 'retailer')}`
      : 'Visit my Vinted closet';
  if (product.demo) return <span className="body-sm">Local sample — no live closet link</span>;
  if (!url)
    return (
      <span className="body-sm">
        {finds ? 'Shop link unavailable' : 'Vinted closet link coming soon'}
      </span>
    );
  return (
    <>
      <AffiliateDisclosure active={!!link?.affiliate} />
      <a
        className="text-link closet-shop-link"
        href={url}
        data-amazon-product={amazon ? product.amazonAsin || product._id : undefined}
        data-placement="collection"
        data-experience={experienceStatus(product)}
        target="_blank"
        rel={
          (amazon ? link?.affiliate : finds && product.affiliateLink)
            ? 'noopener noreferrer sponsored'
            : 'noopener noreferrer'
        }
      >
        <span>{label}</span>
        <ExternalLinkIcon />
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
      {!amazon && finds && product.affiliateLink && (
        <span className="body-sm">Affiliate link: I may earn a commission if you purchase.</span>
      )}
    </>
  );
}
