import { acknowledgment } from '@/lib/acknowledgment';
import { EditorialLink } from './EditorialLink';
import { AffiliateDisclosure } from './AffiliateDisclosure';
import { associatesActive, experienceStatus, experienceLabel, type Experience } from '@/lib/amazon';
import Link from 'next/link';
import { stegaClean } from 'next-sanity';
import { PortableText } from '@portabletext/react';
import type { PortableTextBlock } from '@portabletext/types';
import type { ContentPhoto, DocumentContent, Settings } from '@/lib/types';
import { getContent, getDocuments, getSettings } from '@/lib/content';
import { reviewPhotos, reviewSections } from '@/lib/review-layout';
import { safeVideoUrl } from '@/lib/urls';
import { siteUrl } from '@/lib/seo';
import { ContentImage } from './ContentImage';
import { ReviewMedia } from './ReviewMedia';
import { Video } from './Video';
import { ArrowIcon } from './ArrowIcon';
import { CardGrid } from './CardGrid';
import { findAmazonLink } from '@/lib/looks';
import { findAsin } from '@/lib/finds';
import { ShannequinFitCheck } from './ShannequinFitCheck';
import { WishlistButton } from './WishlistButton';
import { acquisitionDisclosure } from '@/lib/review-transparency';
import { reviewAmazonCta } from '@/lib/review-cta';

function Copy({
  value,
  settings,
  sourceId,
  experience,
}: {
  value?: PortableTextBlock[];
  settings: Settings;
  sourceId: string;
  experience: Experience;
}) {
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
          link: ({ value, children }) => (
            <EditorialLink
              href={value?.href}
              affiliate={value?.affiliate === true}
              affiliateHref={value?.affiliateUrl}
              shortVerified={value?.shortLinkVerified === true}
              settings={settings}
              sourceId={sourceId}
              placement="review"
              experience={experience}
            >
              {children}
            </EditorialLink>
          ),
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
  const [aboutPage, settings] = await Promise.all([getContent('aboutPage'), getSettings()]);
  void returnTo;
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
  const video = safeVideoUrl(stegaClean(d.videoUrl));
  const media = photoItems;
  if (!media.length && !video)
    media.push({
      label: 'Review photograph awaiting publication',
      content: <ContentImage width={800} height={1000} />,
      thumbnail: <span />,
    });
  const title = stegaClean(d.title);
  const accent = stegaClean(d.titleAccent || '');
  const accentValid = !!accent && title.endsWith(accent);
  const sections = reviewSections.filter(({ key }) => d.reviewSections?.[key]?.copy?.length);
  const firstImpression = sections.find(({ key }) => key === 'firstImpression');
  const remainingSections = sections.filter(({ key }) => key !== 'firstImpression');
  const primaryFind = d.primaryFind;
  const findLink = primaryFind ? findAmazonLink(primaryFind, settings) : undefined;
  const shopLabel = reviewAmazonCta(primaryFind?.category || d.categories?.[0]);
  const acquisition = acquisitionDisclosure(d);
  const finalVerdict = d.finalVerdict?.trim() ? (
    <div className="review-story__final-verdict">
      <p>The verdict:</p>
      <p>{d.finalVerdict}</p>
    </div>
  ) : null;
  const shoppingCta = (
    <>
      {primaryFind && findLink && (
        <div className="review-story__final-cta">
          <a
            className="btn btn-accent"
            href={findLink.href}
            target="_blank"
            data-amazon-product={findAsin(primaryFind) || primaryFind._id}
            data-placement="review"
            data-experience={experienceStatus(d)}
            rel={findLink.affiliate ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}
            aria-label={`${shopLabel} (opens in a new tab)`}
          >
            {shopLabel}
          </a>
          {findLink.affiliate && <AffiliateDisclosure active={associatesActive(settings)} />}
        </div>
      )}
    </>
  );
  const root = siteUrl();
  const structured =
    root && !d.demo
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: d.title,
          description: d.excerpt,
          ...(d.publishedAt ? { datePublished: d.publishedAt } : {}),
          mainEntityOfPage: new URL(`/reviews/${d.slug}`, root).href,
        }
      : undefined;
  return (
    <main id="main" className="review-story">
      <article className="container">
        <header className="review-story__header">
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
            <div className="review-story__header-meta">
              {d.publishedAt && (
                <time dateTime={stegaClean(d.publishedAt)}>
                  {new Date(stegaClean(d.publishedAt)).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                </time>
              )}
              {!d.demo && <WishlistButton id={d._id.replace(/^drafts\./, '')} title={d.title} />}
            </div>
          </div>
          {acknowledgment(d) && <p className="review-story__acknowledgment">{acknowledgment(d)}</p>}
          {d.demo && (
            <p className="review-story__sample">
              Illustrative review — fictional copy and sample photography, not a real product test.
            </p>
          )}
        </header>
        <div className="review-story__columns">
          <ReviewMedia
            key={`${d._id}-${d.format || 'written'}`}
            items={media}
            video={
              video ? (
                <Video url={video} captions={d.videoCaptionsUrl} transcript={d.transcript} />
              ) : undefined
            }
          />
          <div className="review-story__hero-copy">
            <div className="review-story__hero-tags">
              {d.categories?.length ? (
                <p className="review-story__category">
                  {d.categories.map((category) => category.title).join(' · ')}
                </p>
              ) : null}
              {d.sizeWorn && <p className="review-story__size">Size worn: {d.sizeWorn}</p>}
            </div>
            {finalVerdict}
            {d.excerpt && <p className="review-story__intro">{d.excerpt}</p>}
            {acquisition && (
              <p className="review-story__acquisition">
                <span aria-hidden="true">✓ </span>{acquisition}
              </p>
            )}
            {shoppingCta}
            {d.experienceStatus && experienceStatus(d) !== 'tested' && (
              <p className="body-sm review-story__experience">
                {experienceLabel(d)}
                {experienceStatus(d) === 'mannequin'
                  ? '. Demonstrated on Shannequin; this does not establish human comfort, movement, wash performance or durability.'
                  : ''}
              </p>
            )}
            {!findLink?.affiliate && <AffiliateDisclosure active={associatesActive(settings)} />}
            {firstImpression && (
              <section
                className="review-story__first-impression review-story__section"
                aria-labelledby="review-firstImpression"
              >
                <h2 id="review-firstImpression">
                  {d.reviewSections?.firstImpression?.heading || firstImpression.heading}
                </h2>
                <div className="review-story__copy">
                  <Copy
                    settings={settings}
                    sourceId={d._id}
                    experience={experienceStatus(d)}
                    value={d.reviewSections?.firstImpression?.copy}
                  />
                </div>
              </section>
            )}
            {!sections.length && (
              <section
                className="review-story__first-impression review-story__section review-story__legacy"
                aria-labelledby="review-legacy"
              >
                <h2 id="review-legacy">The review</h2>
                <Copy
                  settings={settings}
                  sourceId={d._id}
                  experience={experienceStatus(d)}
                  value={d.body}
                />
              </section>
            )}
          </div>
        </div>
      </article>
      <ShannequinFitCheck value={d.fitCheck} sizeWorn={d.sizeWorn} />
      {sections.length > 0 &&
        (remainingSections.length > 0 || d.body?.length) && (
          <div className="container review-story__lower">
            {remainingSections.length > 0 && (
              <div className="review-story__sections">
                {remainingSections.map(({ key, heading }, index) => (
                  <section
                    className="review-story__section"
                    aria-labelledby={`review-${key}`}
                    key={key}
                  >
                    <p className="review-story__number" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                      <span />
                    </p>
                    <h2 id={`review-${key}`}>{d.reviewSections?.[key]?.heading || heading}</h2>
                    <div className="review-story__copy">
                      <Copy
                        settings={settings}
                        sourceId={d._id}
                        experience={experienceStatus(d)}
                        value={d.reviewSections?.[key]?.copy}
                      />
                    </div>
                  </section>
                ))}
              </div>
            )}
            {d.body?.length && (
              <div className="review-story__additional">
                <Copy
                  settings={settings}
                  sourceId={d._id}
                  experience={experienceStatus(d)}
                  value={d.body}
                />
              </div>
            )}
          </div>
        )}
      {d.shannequinQuote?.trim() && (
        <section className="review-shannequin" aria-labelledby="review-shannequin-title">
          <div className="container nopad review-shannequin__inner">
            <div className="review-shannequin__media">
              <div className="review-shannequin__backing" aria-hidden="true" />
              {aboutPage.shannequinImage?.asset?._ref ? (
                <ContentImage
                  image={aboutPage.shannequinImage}
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
      {related.length > 0 && (
        <section className="review-story__related">
          <div className="container">
            <h2>Related reviews</h2>
            <CardGrid items={related} homepage />
          </div>
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
