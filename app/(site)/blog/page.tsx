import { getDocuments } from '@/lib/content';
import { Archive } from '@/components/Archive';
import type { SearchParams } from '@/lib/types';
import { pageMetadata } from '@/lib/seo';
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return pageMetadata(
    'The Blog',
    'Browse CurvyGirlReviews.',
    '/blog',
    Object.keys(await searchParams).length > 0,
  );
}
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const all = await getDocuments('blogPost');
  return <Archive all={all} params={params} kind="blogPost" />;
}
