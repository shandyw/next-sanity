import { getDocuments, getSettings } from '@/lib/content';
import { Archive } from '@/components/Archive';
import type { SearchParams } from '@/lib/types';
import { pageMetadata } from '@/lib/seo';
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return pageMetadata(
    'Curated Finds',
    'Browse CurvyGirlReviews.',
    '/shop/finds',
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
      section="finds"
      shopBase="/shop/finds"
      shopUrl={settings.vintedShopUrl}
    />
  );
}
