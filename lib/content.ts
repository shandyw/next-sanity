import { blogPublicProjection, publicProjection } from './public-projection';
import 'server-only';
import { cache } from 'react';
import { draftMode } from 'next/headers';
import { configured, fetchContent } from './sanity';
import type { DocumentContent, PageContent, Settings } from './types';
import demo from './demo.json';
import { exampleReview, exampleReviewSlug, localDemoReviews } from './demo-review';
export const demoEnabled =
  process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEMO_CONTENT === 'true';
const projection = publicProjection;
export const getDocuments = cache(
  async (type: DocumentContent['_type']): Promise<DocumentContent[]> => {
    if (configured) {
      const preview = (await draftMode()).isEnabled;
      const documents = await fetchContent<DocumentContent[]>(
        `*[_type==$type && defined(slug.current) && ($preview || (defined(publishedAt) && publishedAt <= now()))] | order(publishedAt desc, _id asc) ${type === 'blogPost' ? blogPublicProjection : projection}`,
        { type, preview },
      );
      return type === 'review' ? localDemoReviews(documents) : documents;
    }
    if (!demoEnabled || type !== 'review') return [];
    return [...demo]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .map((d) => ({
        _id: d.id,
        _type: 'review',
        slug: d.id,
        title: d.title,
        excerpt: d.blurb,
        publishedAt: d.publishedAt,
        featuredImage: {
          alt: 'Illustrative sample fashion photo, not the reviewer',
          demoSrc: d.images[0],
        },
        photos: d.images.map((src) => ({
          alt: 'Illustrative sample fashion photo, not the reviewer',
          demoSrc: src,
        })),
        categories: [{ _id: d.category, title: d.category, slug: d.category }],
        brand: { _id: d.brand, title: d.brand },
        sizeWorn: d.sizeTried,
        favorite: d.favorite,
        format: 'written',
        demo: true,
      }));
  },
);
export async function getDocument(type: DocumentContent['_type'], slug: string) {
  return (
    (await getDocuments(type)).find((d) => d.slug === slug) ||
    (type === 'review' && slug === exampleReviewSlug ? exampleReview() : undefined)
  );
}
export const getContent = cache(async (type: 'homepage' | 'aboutPage'): Promise<PageContent> =>
  configured
    ? (await fetchContent<PageContent | null>(`*[_type==$type && _id==$type][0]`, { type })) || {}
    : {},
);
export const getSettings = cache(async (): Promise<Settings> =>
  configured
    ? (await fetchContent<Settings | null>('*[_type=="siteSettings" && _id=="siteSettings"][0]')) ||
      {}
    : {
        socials: [
          { platform: 'Instagram', url: 'https://www.instagram.com/curvygirlreviews' },
          { platform: 'Pinterest', url: 'https://www.pinterest.com/curvygirlreviews/' },
        ],
      },
);

export async function publishedSitemapDocuments(): Promise<DocumentContent[]> {
  return configured
    ? fetchContent<DocumentContent[]>(
        `*[_type in ["review","blogPost"] && defined(slug.current) && defined(publishedAt) && publishedAt <= now()] | order(publishedAt desc) ${publicProjection}`,
        {},
        false,
      )
    : [];
}
