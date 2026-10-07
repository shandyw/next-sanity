import { notFound } from 'next/navigation';
import { getDocument } from '@/lib/content';
import { Article } from '@/components/Article';
import { documentMetadata } from '@/lib/seo';
import type { SearchParams } from '@/lib/types';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const d = await getDocument('blogPost', slug);
  return d
    ? documentMetadata(d, '/blog/' + slug)
    : { title: 'Article not found', robots: { index: false } };
}
export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const d = await getDocument('blogPost', slug);
  if (!d) notFound();
  const from = (await searchParams).from;
  const returnTo =
    typeof from === 'string' && /^\/(reviews|blog|my-faves)(\?|$)/.test(from) ? from : '/blog';
  return <Article document={d} returnTo={returnTo} base="/blog" />;
}
