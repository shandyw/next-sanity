import { ClosetShopLink } from '@/components/ClosetShopLink';
import { getDocuments, getSettings } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { EditorialHero } from '@/components/EditorialHero';
import Link from 'next/link';
import { stegaClean } from 'next-sanity';
import { ContentImage } from '@/components/ContentImage';
import { ProductAction } from '@/components/ProductAction';
import { shoppingSection } from '@/lib/shopping';
import { WishlistItems } from '@/components/WishlistItems';

export const metadata = pageMetadata('Wishlist', 'Items saved in this browser.', '/wishlist', true);
export default async function Wishlist() {
  const [products, settings] = await Promise.all([getDocuments('product'), getSettings()]);
  return (
    <main id="main" className="reviews-page container">
      <EditorialHero
        title="Wishlist"
        intro="Save the pieces you like. No account needed."
        disclaimer={
          <>
            <strong>Saved in this browser only.</strong>
            <p>
              Clearing site data removes your wishlist. It doesn’t sync across devices. Items aren’t
              reserved.
            </p>
          </>
        }
      />
      <WishlistItems
        items={products.map((product) => {
          const status = stegaClean(product.availability);
          const href = `/shop/${encodeURIComponent(stegaClean(product.slug))}`;
          return {
            id: product._id,
            name: stegaClean(product.title),
            image: (
              <Link href={href} aria-label={`View ${stegaClean(product.title)}`}>
                <ContentImage image={product.photos?.[0]} width={144} height={180} sizes="72px" />
              </Link>
            ),
            title: (
              <>
                <span className="product-card__brand">{product.brand?.title}</span>
                <Link href={href} className="review-card__title-link">
                  {product.title}
                </Link>
              </>
            ),
            shop: <ClosetShopLink product={product} settings={settings} />,
            status:
              status === 'sold'
                ? 'Sold'
                : status === 'reserved'
                  ? 'Reserved'
                  : status === 'available'
                    ? 'Available'
                    : shoppingSection(product) === 'finds'
                      ? 'Check retailer'
                      : 'Unknown',
            action: <ProductAction product={product} />,
          };
        })}
      />
    </main>
  );
}
