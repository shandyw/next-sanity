import type { MetadataRoute } from 'next';
import { publishedSitemapDocuments } from '@/lib/content';
import { getLooks } from '@/lib/looks';
import { siteUrl } from '@/lib/seo';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const root = siteUrl();
  if (!root) return [];
  const [documents, looks] = await Promise.all([publishedSitemapDocuments(), getLooks()]);
  return [
    ...[
      '/',
      '/about',
      '/reviews',
      '/blog',
      '/shop',
      '/shop/closet',
      '/support',
      '/my-faves',
      '/privacy',
      '/disclosures',
    ].map((path) => ({
      url: new URL(path, root).href,
    })),
    ...documents
      .filter((d) => !d.demo)
      .map((d) => ({
        url: new URL(`/${d._type === 'review' ? 'reviews' : 'blog'}/${d.slug}`, root).href,
        lastModified: d.publishedAt,
      })),
    ...looks.map((look) => ({
      url: new URL(`/looks/${look.slug}`, root).href,
      lastModified: look.publishedAt,
    })),
  ];
}
