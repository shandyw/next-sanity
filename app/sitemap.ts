import type { MetadataRoute } from 'next';
import { publishedSitemapDocuments } from '@/lib/content';
import { siteUrl } from '@/lib/seo';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const root = siteUrl();
  if (!root) return [];
  const documents = await publishedSitemapDocuments();
  return [
    ...[
      '/',
      '/about',
      '/reviews',
      '/blog',
      '/shop',
      '/shop/closet',
      '/shop/finds',
      '/support',
      '/my-faves',
      '/privacy',
    ].map((path) => ({
      url: new URL(path, root).href,
    })),
    ...documents
      .filter((d) => !d.demo)
      .map((d) => ({
        url: new URL(
          `/${d._type === 'review' ? 'reviews' : d._type === 'product' ? 'shop' : 'blog'}/${d.slug}`,
          root,
        ).href,
        lastModified: d.publishedAt,
      })),
  ];
}
