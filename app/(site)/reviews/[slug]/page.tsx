import { notFound } from 'next/navigation';
import { getDocument } from '@/lib/content';
import { Article } from '@/components/Article';
import { documentMetadata } from '@/lib/seo';
import type { SearchParams } from '@/lib/types';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const d = await getDocument('review', slug);
  return d
    ? documentMetadata(d, '/reviews/' + slug)
    : { title: 'Article not found', robots: { index: false } };
}
export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const d = await getDocument('review', slug);
  if (!d) notFound();
  const from = (await searchParams).from;
  const returnTo =
    typeof from === 'string' && /^\/(reviews|blog|my-faves)(\?|$)/.test(from) ? from : '/reviews';
  return <Article document={d} returnTo={returnTo} base="/reviews" />;
}
