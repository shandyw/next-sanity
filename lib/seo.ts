import { createImageUrlBuilder } from '@sanity/image-url';
import type { ContentPhoto } from './types';
import type { Metadata } from 'next';
import type { DocumentContent } from './types';
export function siteUrl() {
  return process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined;
}
export function pageMetadata(
  title: string,
  description: string,
  path: string,
  noindex = false,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      url: path,
      type: 'website',
      images: [{ url: '/img/curvy.png', alt: 'CurvyGirlReviews pink hanger logo' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/img/curvy.png'] },
  };
}
export function socialImageUrl(image: ContentPhoto | undefined) {
  if (
    image?.asset?._ref &&
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID &&
    process.env.NEXT_PUBLIC_SANITY_DATASET
  )
    return createImageUrlBuilder({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    })
      .image(image)
      .width(1200)
      .height(630)
      .fit('crop')
      .auto('format')
      .url();
  return image?.asset?.url;
}
export function documentMetadata(d: DocumentContent, path: string): Metadata {
  const image = socialImageUrl(d.seo?.socialImage || d.featuredImage);
  return {
    ...pageMetadata(
      d.seo?.title || d.title,
      d.seo?.description || d.excerpt || d.description || d.title,
      path,
      !!d.demo,
    ),
    openGraph: {
      title: d.seo?.title || d.title,
      description: d.seo?.description || d.excerpt,
      url: path,
      type: 'article',
      publishedTime: d.publishedAt,
      ...(image
        ? {
            images: [
              { url: image, alt: d.seo?.socialImage?.alt || d.featuredImage?.alt || d.title },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: d.seo?.title || d.title,
      description: d.seo?.description || d.excerpt,
      ...(image ? { images: [image] } : {}),
    },
  };
}
