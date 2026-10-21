import { EditorialLink } from './EditorialLink';
import { AffiliateDisclosure } from './AffiliateDisclosure';
import { associatesActive, experienceStatus } from '@/lib/amazon';
import { ReviewArticle } from './ReviewArticle';
import { stegaClean } from 'next-sanity';
import { PortableText } from '@portabletext/react';
import type { DocumentContent, ContentPhoto } from '@/lib/types';
import { ContentImage } from './ContentImage';
import { PhotoGallery } from './PhotoGallery';
import { EditorialHero } from './EditorialHero';
import { Video } from './Video';
import { CardGrid } from './CardGrid';
import { getDocuments, getSettings } from '@/lib/content';
import { ProductGrid } from './ProductGrid';
import { siteUrl } from '@/lib/seo';
export async function Article({
  document: d,
  returnTo,
  base,
}: {
  document: DocumentContent;
  returnTo: string;
  base: string;
}) {
  if (d._type === 'review') return <ReviewArticle document={d} returnTo={returnTo} />;
  const relatedSlugs = new Set(d.relatedReviews?.map((review) => review.slug) || []);
  const related = relatedSlugs.size
    ? (await getDocuments('review')).filter(
        (review) => relatedSlugs.has(review.slug) && review._id !== d._id,
      )
    : [];
  const settings = await getSettings();
  const root = siteUrl();
  const structured =
    root && !d.demo
      ? {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: d.title,
          description: d.excerpt,
          datePublished: d.publishedAt,
          ...(d.author ? { author: { '@type': 'Person', name: d.author.name } } : {}),
          mainEntityOfPage: new URL(`${base}/${d.slug}`, root).href,
        }
      : undefined;
  return (
    <main id="main" className="container">
      <nav className="review-detail__breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a> / <a href={returnTo}>{base === '/blog' ? 'Blog' : 'Reviews'}</a> /{' '}
        <span aria-current="page">{d.title}</span>
      </nav>
      <EditorialHero title={d.title} intro={d.excerpt || ''} />
      {d.author && (
        <p>
          By {d.author.name}
          {d.publishedAt && (
            <>
              {' '}
              ·{' '}
              <time dateTime={d.publishedAt}>
                {new Date(d.publishedAt).toLocaleDateString('en-US', {
                  timeZone: 'UTC',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </>
          )}
        </p>
      )}
      <AffiliateDisclosure active={associatesActive(settings)} />
      <div className="review-detail__top">
        <div className="review-detail__content">
          <h2 className="headline-md review-detail__review-title">The review</h2>
          {d.sizeWorn && <p>Size worn: {d.sizeWorn}</p>}
          {d.fitNotes && <p>{d.fitNotes}</p>}
          {d.priceWhenReviewed !== undefined && d.reviewCurrency && (
            <p>
              Price when reviewed:{' '}
              {new Intl.NumberFormat('en', {
                style: 'currency',
                currency: stegaClean(d.reviewCurrency),
              }).format(d.priceWhenReviewed)}
            </p>
          )}
          {d.demo && (
            <p className="demo-notice">
              Illustrative design sample — fictional review copy and placeholder photographs, not a
              real product test.
            </p>
          )}
        </div>
        <PhotoGallery
          photos={(d.photos?.length ? d.photos : [d.featuredImage]).map((photo, i) => (
            <ContentImage
              key={i}
              image={photo}
              className="review-detail__main-image"
              width={600}
              height={650}
              priority={i === 0}
            />
          ))}
          thumbnails={(d.photos?.length ? d.photos : [d.featuredImage]).map((photo, i) => (
            <ContentImage key={i} image={photo} width={80} height={80} />
          ))}
        />
      </div>
      <article className="article-body">
        {d.body && (
          <PortableText
            value={d.body}
            components={{
              types: {
                image: ({ value }: { value: ContentPhoto }) => (
                  <ContentImage image={value} width={760} height={570} />
                ),
              },
              marks: {
                link: ({ value, children }) => (
                  <EditorialLink
                    href={value?.href}
                    affiliate={value?.affiliate === true}
                    affiliateHref={value?.affiliateUrl}
                    shortVerified={value?.shortLinkVerified === true}
                    settings={settings}
                    sourceId={d._id}
                    placement="guide"
                    experience={experienceStatus(d)}
                  >
                    {children}
                  </EditorialLink>
                ),
              },
            }}
          />
        )}
        {d.videoUrl && (
          <Video url={d.videoUrl} transcript={d.transcript} captions={d.videoCaptionsUrl} />
        )}
      </article>
      {related.length ? (
        <section>
          <h2 className="headline-lg">Related reviews</h2>
          <CardGrid items={related} homepage />
        </section>
      ) : null}
      {d.products?.length || d.relatedProducts?.length ? (
        <section>
          <h2 className="headline-lg">In my closet</h2>
          <ProductGrid
            items={d.products?.length ? d.products : d.relatedProducts || []}
            settings={settings}
          />
        </section>
      ) : null}
      {structured && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }}
        />
      )}
    </main>
  );
}
