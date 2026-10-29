import { CurtainReveal } from '@/components/CurtainReveal';
import { getContent, getDocuments, demoEnabled } from '@/lib/content';
import { LatestVerdicts } from '@/components/LatestVerdicts';
import { ContentImage } from '@/components/ContentImage';
import { EditorialHero } from '@/components/EditorialHero';
import { Shannequin } from '@/components/Shannequin';
import { RequestBanner } from '@/components/RequestBanner';
import { Video } from '@/components/Video';
import { pageMetadata } from '@/lib/seo';
import { ArrowIcon } from '@/components/ArrowIcon';
import Link from 'next/link';
import { getLooks, lookImage, lookOccasionLabel } from '@/lib/looks';
import { getSettings } from '@/lib/content';
import { ClosetBanner } from '@/components/ClosetBanner';
import { WishlistButton } from '@/components/WishlistButton';
export const metadata = pageMetadata(
  'Real Curves. Unfiltered Reviews.',
  'Honest plus-size fashion reviews, clothing finds, and review requests.',
  '/',
);
export default async function Home() {
  const [content, reviews, about, looks, settings] = await Promise.all([
    getContent('homepage'),
    getDocuments('review'),
    getContent('aboutPage'),
    getLooks(),
    getSettings(),
  ]);
  const categories = [
    ...new Map(
      reviews
        .flatMap((review) => review.categories || [])
        .map((category) => [category.slug || category._id, category]),
    ).values(),
  ].slice(0, 8);
  return (
    <main id="main">
      <EditorialHero
        title={content.heroLine1 || 'Big opinions,'}
        emphasis={`${content.heroEmphasis || 'questionable sizing.'}${content.heroLine2 ? ` ${content.heroLine2}` : ''}`}
        intro={content.heroIntro || 'Real try-ons. Honest fit notes. A size 16–18 perspective.'}
        scriptAccent={content.heroScriptAccent ?? 'questionable'}
        eyebrow="Fashion Reviews"
        cta={{ label: 'Explore the Reviews', href: '/reviews' }}
        media={
          <CurtainReveal
            leftPosition={`${(content.heroBack?.hotspot?.x ?? 0.5) * 100}% ${(content.heroBack?.hotspot?.y ?? 0.5) * 100}%`}
            rightPosition={`${(content.heroFront?.hotspot?.x ?? 0.5) * 100}% ${(content.heroFront?.hotspot?.y ?? 0.5) * 100}%`}
            interactive={Boolean(content.heroBack?.asset?._ref && content.heroFront?.asset?._ref)}
            leftPhoto={
              <ContentImage
                image={content.heroBack}
                width={900}
                height={1190}
                sizes="(max-width: 767px) 40vw, 20vw"
                priority
              />
            }
            rightPhoto={
              <ContentImage
                image={content.heroFront}
                width={900}
                height={1190}
                sizes="(max-width: 767px) 40vw, 20vw"
                priority
              />
            }
          />
        }
      />

      <LatestVerdicts reviews={reviews} />

      <section className="container home-looks" aria-labelledby="home-looks-heading">
        <div className="home-section-heading">
          <h2 id="home-looks-heading">Shop the Looks</h2>
          <Link className="text-link" href="/shop">
            Browse all Looks →
          </Link>
        </div>
        {looks.length ? (
          <div className="look-grid">
            {looks.slice(0, 3).map((look) => (
              <article className="look-card" key={look._id}>
                <Link
                  className="look-card__image"
                  href={`/looks/${encodeURIComponent(look.slug)}`}
                  aria-label={`View ${look.title}`}
                >
                  <ContentImage image={lookImage(look)} width={720} height={900} />
                </Link>
                <div className="look-card__copy">
                  <WishlistButton id={look._id} title={look.title} />
                  <p className="eyebrow">{lookOccasionLabel(look.occasion)}</p>
                  <h3>
                    <Link href={`/looks/${encodeURIComponent(look.slug)}`}>{look.title}</Link>
                  </h3>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>Outfit stories are coming soon.</p>
        )}
      </section>

      {categories.length > 0 && (
        <section className="container home-categories" aria-labelledby="home-categories-heading">
          <h2 id="home-categories-heading">Browse by Category</h2>
          <div className="look-filters">
            {categories.map((category) => (
              <Link
                key={category._id}
                href={`/reviews?category=${encodeURIComponent(category.slug || category._id)}`}
              >
                {category.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="about" id="about" aria-labelledby="aboutHeading">
        <div className="container about__inner">
          <div className="about__media">
            <figure className="about__figure">
              <ContentImage
                className="about__img"
                image={content.aboutImage}
                demoSrc="https://images.unsplash.com/photo-1475178626620-a4d074967452?w=680&amp;h=520&amp;fit=crop&amp;q=80&amp;fm=jpg"
                width={680}
                height={520}
              />
              {demoEnabled && !content.aboutImage?.asset?._ref && (
                <figcaption className="body-sm">
                  Illustrative placeholder photograph — not Shandy.
                </figcaption>
              )}
            </figure>
          </div>

          <div className="about__copy">
            <h2 className="about__heading" id="aboutHeading">
              {content.aboutHeading || (
                <>
                  Size 16–18.
                  <br />
                  Zero sugarcoating.
                </>
              )}
            </h2>
            <p className="body-md about__text">
              {content.aboutIntro ||
                'I’m not an influencer. I’m here for the great fits, the awkward cuts, and the clothes that look nothing like the pictures.'}
            </p>
            <a className="text-link about__link" href="/about">
              <span>More About Me</span>
              <ArrowIcon />
            </a>
          </div>
        </div>
      </section>

      {content.videoUrl && (
        <section className="container home-video" aria-label="Fashion video">
          <Video
            url={content.videoUrl}
            transcript={content.videoTranscript}
            captions={content.videoCaptionsUrl}
          />
        </section>
      )}

      <Shannequin image={about.shannequinImage} />
      <div className="container home-closet">
        <ClosetBanner settings={settings} />
      </div>
      <section className="container home-support" aria-labelledby="home-support-heading">
        <h2 id="home-support-heading">Support the Reviews</h2>
        <p>Help choose what I try on next or visit my Amazon gift wishlist.</p>
        <Link className="btn btn-accent" href="/support">
          Ways to support
        </Link>
      </section>
      <RequestBanner content={content} />
    </main>
  );
}
