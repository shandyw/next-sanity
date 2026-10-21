import { reviewWishlistItems } from '@/lib/catalog';
import { Archive } from '@/components/Archive';
import { getDocuments, getSettings } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import type { SearchParams } from '@/lib/types';
export const metadata = pageMetadata(
  'My Review Wishlist',
  'Curated Finds I would love to try and review next.',
  '/my-wishlist',
  true,
);
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [products, settings, params] = await Promise.all([
    getDocuments('product'),
    getSettings(),
    searchParams,
  ]);
  const items = reviewWishlistItems(products);
  return (
    <Archive
      all={items}
      params={params}
      kind="product"
      section="finds"
      shopBase="/my-wishlist"
      settings={settings}
      reviewWishlist
    />
  );
}
