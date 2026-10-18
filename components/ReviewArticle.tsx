import Link from 'next/link';
import { stegaClean } from 'next-sanity';
import { PortableText } from '@portabletext/react';
import type { PortableTextBlock } from '@portabletext/types';
import type { ContentPhoto, DocumentContent } from '@/lib/types';
import { getContent, getDocuments } from '@/lib/content';
import { reviewPhotos, reviewSections } from '@/lib/review-layout';
import { safeExternal } from '@/lib/urls';
import { siteUrl } from '@/lib/seo';
import { ContentImage } from './ContentImage';
import { ReviewMedia } from './ReviewMedia';
import { Video } from './Video';
import { ArrowIcon } from './ArrowIcon';
import { CardGrid } from './CardGrid';

function Copy({ value }: { value?: PortableTextBlock[] }) {
  return value?.length ? (
    <PortableText
      value={value}
      components={{
        types: {
          image: ({ value: image }: { value: ContentPhoto }) => (
            <ContentImage image={image} width={760} height={570} />
          ),
        },
        marks: {
          link: ({ value, children }) => {
            const href = safeExternal(value?.href);
            return href ? (
              <a href={href} rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <>{children}</>
            );
          },
        },
      }}
    />
  ) : null;
}
export async function ReviewArticle({
  document: d,
  returnTo,
}: {
  document: DocumentContent;
  returnTo: string;
}) {
  const homepage = await getContent('homepage');
  const relatedSlugs = new Set(d.relatedReviews?.map((review) => review.slug) || []);
  const related = relatedSlugs.size
    ? (await getDocuments('review')).filter(
        (review) => review._id !== d._id && relatedSlugs.has(review.slug),
      )
    : [];
  const photos = reviewPhotos(d);
  const photoItems = photos.map((photo, index) => ({
    label: photo.caption || (index === 0 ? 'Full look' : `Detail ${index}`),
    content: (
      <ContentImage
        image={photo}
        width={800}
        height={1000}
        sizes="(max-width: 767px) 90vw, 50vw"
        priority={index === 0}
      />
    ),
    thumbnail: (
      <ContentImage image={photo} width={240} height={300} sizes="(max-width: 767px) 28vw, 16vw" />
    ),
  }));
  const video = safeExternal(stegaClean(d.videoUrl));
  const videoItem = video
    ? [
        {
          label: 'My try-on',
          video: true,
          content: <Video url={video} captions={d.videoCaptionsUrl} transcript={d.transcript} />,
          thumbnail: (
            <span className="review-story__video-thumb" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
                <path d="m8 4 12 8-12 8Z" />
              </svg>
              Video
            </span>
          ),
        },
      ]
    : [];
  const media =
    d.format === 'video' ? [...videoItem, ...photoItems] : [...photoItems, ...videoItem];
  if (!media.length)
    media.push({
      label: 'Review photograph awaiting publication',
      content: <ContentImage width={800} height={1000} />,
      thumbnail: <span />,
    });
  const title = stegaClean(d.title);
  const accent = stegaClean(d.titleAccent || '');
  const accentValid = !!accent && title.endsWith(accent);
  const sections = reviewSections.filter(({ key }) => d.reviewSections?.[key]?.copy?.length);
  const product = d.ctaProduct?.slug ? d.ctaProduct : undefined;
  const root = siteUrl();
  const structured =
    root && !d.demo
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: d.title,
          description: d.excerpt,
          ...(d.publishedAt ? { datePublished: d.publishedAt } : {}),
          ...(d.author ? { author: { '@type': 'Person', name: d.author.name } } : {}),
          mainEntityOfPage: new URL(`/reviews/${d.slug}`, root).href,
        }
      : undefined;
  return (
    <main id="main" className="review-story">
      <article className="container">
        <header className="review-story__header">
          {d.categories?.length ? (
            <p className="review-story__category">
              {d.categories.map((category) => category.title).join(' · ')}
            </p>
          ) : null}
          <div className="review-story__headline-row">
            <h1>
              {accentValid ? (
                <>
                  {title.slice(0, title.length - accent.length)}
                  <span className="review-story__accent">{accent}</span>
                </>
              ) : (
                d.title
              )}
            </h1>
            {d.sizeWorn && <p className="review-story__size">Size worn: {d.sizeWorn}</p>}
          </div>
          {d.publishedAt && (
            <p className="review-story__byline">
              <time dateTime={stegaClean(d.publishedAt)}>
                {new Date(stegaClean(d.publishedAt)).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}
              </time>
            </p>
          )}
          {d.demo && (
            <p className="review-story__sample">
              Illustrative review — fictional copy and sample photography, not a real product test.
            </p>
          )}
        </header>
        <div className="review-story__columns">
          <ReviewMedia key={`${d._id}-${d.format || 'written'}`} items={media} />
          <div className="review-story__sections">
            {sections.length ? (
              sections.map(({ key, heading }) => (
                <section
                  className="review-story__section"
                  key={key}
                  aria-labelledby={`review-${key}`}
                >
                  <p className="review-story__number" aria-hidden="true">
                    {String(
                      reviewSections.findIndex((section) => section.key === key) + 1,
                    ).padStart(2, '0')}
                    <span />
                  </p>
                  <h2 id={`review-${key}`}>{d.reviewSections?.[key]?.heading || heading}</h2>
                  <div className="review-story__copy">
                    <Copy value={d.reviewSections?.[key]?.copy} />
                  </div>
                </section>
              ))
            ) : (
              <section className="review-story__section review-story__legacy">
                <h2>The review</h2>
                {d.excerpt && <p>{d.excerpt}</p>}
                {d.fitNotes && <p>{d.fitNotes}</p>}
                <Copy value={d.body} />
              </section>
            )}
            {sections.length > 0 && d.body?.length ? (
              <div className="review-story__additional">
                <Copy value={d.body} />
              </div>
            ) : null}
            {d.priceWhenReviewed !== undefined && d.reviewCurrency && (
              <p className="body-sm">
                Price when reviewed:{' '}
                {new Intl.NumberFormat('en', {
                  style: 'currency',
                  currency: stegaClean(d.reviewCurrency),
                }).format(d.priceWhenReviewed)}
              </p>
            )}
          </div>
        </div>
      </article>
      {d.shannequinQuote?.trim() && (
        <section className="review-shannequin" aria-labelledby="review-shannequin-title">
          <div className="container review-shannequin__inner">
            <div className="review-shannequin__media">
              <div className="review-shannequin__backing" aria-hidden="true" />
              {homepage.shannequinImage?.asset?._ref ? (
                <ContentImage
                  image={homepage.shannequinImage}
                  preserveFullImage
                  width={600}
                  height={900}
                  sizes="(max-width: 767px) 75vw, 35vw"
                />
              ) : (
                <div
                  className="review-shannequin__placeholder"
                  role="img"
                  aria-label="Shared Shannequin photograph awaiting publication"
                >
                  Shannequin’s photograph is coming soon.
                </div>
              )}
            </div>
            <div className="review-shannequin__copy">
              <h2 id="review-shannequin-title">Shannequin Says…</h2>
              <blockquote>
                <p>{d.shannequinQuote}</p>
                <footer>Shannequin · Size 18</footer>
              </blockquote>
              <Link href="/about#shannequin" className="text-link">
                <span>Meet Shannequin</span>
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </section>
      )}
      {product && (
        <section className="container review-story__product" aria-labelledby="review-product-title">
          <div>
            <p className="eyebrow">
              {product.shoppingSection === 'finds' ? 'Curated find' : 'From my closet'}
            </p>
            <h2 id="review-product-title">{product.title}</h2>
            {product.availability === 'sold' && (
              <p>This item has sold. Its details are still available.</p>
            )}
          </div>
          <Link
            className="btn btn-accent"
            href={`/shop/${encodeURIComponent(stegaClean(product.slug))}`}
          >
            {d.ctaLabel ||
              (product.shoppingSection === 'finds' ? 'Explore this find' : 'View item details')}
            <ArrowIcon />
          </Link>
        </section>
      )}
      {related.length > 0 && (
        <section className="container review-story__related">
          <h2>Related reviews</h2>
          <CardGrid items={related} homepage />
        </section>
      )}
      {structured && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }}
        />
      )}
    </main>
  );
}
