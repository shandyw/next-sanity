import { closetStatus } from '@/lib/catalog';
import { isAmazonProduct, productPhotos } from '@/lib/amazon';
import { ClosetShopLink } from '@/components/ClosetShopLink';
import { getDocuments, getSettings } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { EditorialHero } from '@/components/EditorialHero';
import Link from 'next/link';
import { stegaClean } from 'next-sanity';
import { ProductImage } from '@/components/ProductImage';
import { ProductAction } from '@/components/ProductAction';
import { shoppingSection } from '@/lib/shopping';
import { WishlistItems } from '@/components/WishlistItems';

export const metadata = pageMetadata(
  'Saved Items',
  'Items saved in this browser.',
  '/wishlist',
  true,
);
export default async function Wishlist() {
  const [products, settings] = await Promise.all([getDocuments('product'), getSettings()]);
  return (
    <main id="main" className="reviews-page container">
      <EditorialHero
        title="Saved Items"
        intro="Save the pieces you like. No account needed."
        disclaimer={
          <>
            <strong>Saved in this browser only.</strong>
            <p>
              Clearing site data removes your saved items. It doesn’t sync across devices. Items
              aren’t reserved.
            </p>
          </>
        }
      />
      <WishlistItems
        items={products.map((product) => {
          const status = closetStatus(product);
          const href = `/shop/${encodeURIComponent(stegaClean(product.slug))}`;
          return {
            id: product._id,
            name: stegaClean(product.title),
            image: (
              <Link href={href} aria-label={`View ${stegaClean(product.title)}`}>
                <ProductImage
                  image={productPhotos(product)[0]}
                  importedImageUrl={product.importedImageUrl}
                  title={stegaClean(product.title)}
                  width={144}
                  height={180}
                  sizes="72px"
                />
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
            status: product.archived
              ? 'Archived'
              : isAmazonProduct(product)
                ? 'View on Amazon'
                : status === 'sold'
                  ? 'Sold'
                  : status === 'reserved'
                    ? 'Reserved'
                    : status === 'available'
                      ? 'Available'
                      : shoppingSection(product) === 'finds'
                        ? 'Check retailer'
                        : 'Unknown',
            action: <ProductAction product={product} settings={settings} />,
          };
        })}
      />
    </main>
  );
}
