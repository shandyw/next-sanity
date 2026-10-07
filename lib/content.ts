import 'server-only';
import { cache } from 'react';
import { draftMode } from 'next/headers';
import { configured, fetchContent } from './sanity';
import type { DocumentContent, PageContent, Settings } from './types';
import demo from './demo.json';
import { localDemoProducts } from './demo-products';
export const demoEnabled =
  process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEMO_CONTENT === 'true';
const projection = `{...,"slug":slug.current,"createdAt":_createdAt,"author":author->{name},"brand":brand->{_id,title,"slug":slug.current},"categories":categories[]->{_id,title,"slug":slug.current},"relatedReview":relatedReview->{title,"slug":slug.current},"products":*[ _type == "product" && relatedReview._ref == ^._id]{...,"slug":slug.current},"relatedReviews":relatedReviews[]->{title,"slug":slug.current},"relatedProducts":relatedProducts[]->{...,"slug":slug.current}}`;
export const getDocuments = cache(
  async (type: DocumentContent['_type']): Promise<DocumentContent[]> => {
    if (configured) {
      const preview = (await draftMode()).isEnabled;
      const documents = await fetchContent<DocumentContent[]>(
        `*[_type==$type && defined(slug.current) ${type === 'product' ? '' : '&& ($preview || (defined(publishedAt) && publishedAt <= now()))'}] | order(${type === 'product' ? '_createdAt' : 'publishedAt'} desc, _id asc) ${projection}`,
        { type, preview },
      );
      return type === 'product' ? localDemoProducts(documents) : documents;
    }
    if (type === 'product') return localDemoProducts([]);
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
  return (await getDocuments(type)).find((d) => d.slug === slug);
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
        `*[_type in ["review","blogPost","product"] && defined(slug.current) && (_type == "product" || (defined(publishedAt) && publishedAt <= now()))] | order(publishedAt desc) { _id, _type, title, publishedAt, "slug":slug.current }`,
        {},
        false,
      )
    : [];
}
