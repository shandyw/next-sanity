import { getDocuments } from '@/lib/content';
import { Archive } from '@/components/Archive';
import type { SearchParams } from '@/lib/types';
import { pageMetadata } from '@/lib/seo';
import { redirect, notFound } from 'next/navigation';
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return pageMetadata(
    'Fashion Reviews',
    'Browse CurvyGirlReviews.',
    '/reviews',
    Object.keys(await searchParams).length > 0,
  );
}
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const all = await getDocuments('review');
  if (typeof params.review === 'string') {
    const match = all.find((d) => d._id === params.review || d.slug === params.review);
    if (match) redirect('/reviews/' + match.slug);
    notFound();
  }
  return <Archive all={all} params={params} kind="review" />;
}
