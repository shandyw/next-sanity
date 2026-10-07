import { getDocuments, getSettings } from '@/lib/content';
import { Archive } from '@/components/Archive';
import type { SearchParams } from '@/lib/types';
import { pageMetadata } from '@/lib/seo';
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return pageMetadata(
    'My Vinted Closet',
    'Browse CurvyGirlReviews.',
    '/shop/closet',
    Object.keys(await searchParams).length > 0,
  );
}
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const all = await getDocuments('product');
  const settings = await getSettings();
  return (
    <Archive
      all={all}
      params={params}
      kind="product"
      section="closet"
      shopBase="/shop/closet"
      shopUrl={settings.vintedShopUrl}
    />
  );
}
