import { getDocuments } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { InnerHero } from '@/components/InnerHero';
import { ProductCard } from '@/components/ProductGrid';
import { WishlistItems } from '@/components/WishlistItems';

export const metadata = pageMetadata('Wishlist', 'Items saved in this browser.', '/wishlist', true);
export default async function Wishlist() {
  const products = await getDocuments('product');
  return (
    <main id="main" className="reviews-page container">
      <InnerHero title="Wishlist" intro="Save the pieces you like. No account needed." />
      <p className="body-lg">
        Your wishlist is saved only in this browser. Clearing site data removes it, and it{' '}
        <strong>does not sync across devices</strong>. Saving an item does not reserve it.
      </p>
      <WishlistItems
        cards={products.map((product) => ({
          id: product._id,
          content: <ProductCard product={product} />,
        }))}
      />
    </main>
  );
}
