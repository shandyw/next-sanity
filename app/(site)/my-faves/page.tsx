import { getDocuments } from '@/lib/content';
import { Archive } from '@/components/Archive';
import type { SearchParams } from '@/lib/types';
import { pageMetadata } from '@/lib/seo';
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return pageMetadata(
    'My Faves',
    'Browse CurvyGirlReviews.',
    '/my-faves',
    Object.keys(await searchParams).length > 0,
  );
}
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const all = await getDocuments('review');
  return <Archive all={all.filter((d) => d.favorite)} params={params} kind="favorites" />;
}
