import { getContent, getDocuments } from '@/lib/content';
import { CardGrid } from '@/components/CardGrid';
import { ContentImage } from '@/components/ContentImage';
import { HomeSearch } from '@/components/HomeSearch';
import { RequestBanner } from '@/components/RequestBanner';
import { Video } from '@/components/Video';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'Real Curves. Unfiltered Reviews.',
  'Honest plus-size fashion reviews, clothing finds, and review requests.',
  '/',
);
export default async function Home() {
  const [content, reviews] = await Promise.all([getContent('homepage'), getDocuments('review')]);
  const latest = reviews.slice(0, 3);
  return (
    <main id="main">
      <section className="hero" aria-labelledby="heroHeading">
        <div className="container hero__inner">
          <div className="hero__copy">
            <h1 className="display" id="heroHeading">
              {content.heroLine1 || 'Real Curves.'}
              <br />
              <span className="hero__mark">{content.heroEmphasis || 'Unfiltered'}</span>{' '}
              {content.heroLine2 || 'Reviews.'}
            </h1>
            <p className="hero__lede">
              {content.heroIntro || 'Size 16–18. Honest try-ons. No pretending it fits.'}
            </p>
            <div className="hero__actions">
              <a className="btn btn-accent btn-lg" href="/reviews">
                Find Your Next Win
              </a>
            </div>
          </div>

          <div className="hero__collage">
            <span className="doodle doodle--note">
              But can I<br />
              sit in it?
            </span>

            <figure className="polaroid polaroid--back">
              <ContentImage
                image={content.heroBack}
                demoSrc="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=760&amp;h=900&amp;fit=crop&amp;q=80&amp;fm=jpg"
                width={760}
                height={900}
                priority
              />
            </figure>

            <figure className="polaroid polaroid--front">
              <ContentImage
                image={content.heroFront}
                demoSrc="https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=760&amp;h=900&amp;fit=crop&amp;q=80&amp;fm=jpg"
                width={760}
                height={900}
                priority
              />
              <figcaption className="tape-tag">
                THE FIT
                <br />
                CHECK
              </figcaption>
            </figure>

            <span className="doodle doodle--arrow" aria-hidden="true">
              <svg viewBox="0 0 56 96">
                <path d="M9 91C0 59 6 22 45 8M29 7l16 1-5 16" />
              </svg>
            </span>

            <span className="doodle doodle--heart" aria-hidden="true">
              <img src="/img/hollow_pink_heart.svg" alt="" />
            </span>
          </div>
        </div>
      </section>

      <section className="filters-band" aria-label="Search reviews">
        <div className="container">
          <HomeSearch />
        </div>
      </section>

      <section className="review-section" id="trending" aria-labelledby="trendingHeading">
        <div className="container">
          <div className="section-heading">
            <h2 id="trendingHeading">The Latest Verdicts</h2>
            <p className="hand-note">
              Real clothes.
              <br />
              Real bodies.
              <br />
              Real opinions.
              <img src="/img/hollow_yellow_heart.svg" alt="" aria-hidden="true" />
            </p>
            <a className="archive-link" href="/reviews">
              View All Reviews
            </a>
          </div>

          <CardGrid items={latest} homepage />
        </div>
      </section>

      <section className="about" id="about" aria-labelledby="aboutHeading">
        <div className="container about__inner">
          <div className="about__media">
            <figure className="polaroid polaroid--about">
              <ContentImage
                className="about__img"
                image={content.aboutImage}
                demoSrc="https://images.unsplash.com/photo-1475178626620-a4d074967452?w=680&amp;h=520&amp;fit=crop&amp;q=80&amp;fm=jpg"
                width={680}
                height={520}
              />
            </figure>
            <span className="doodle doodle--scribble" aria-hidden="true">
              Same
              <br />
              size.
              <br />
              Different
              <br />
              fits.
              <br />
              <img
                className="annotation-heart"
                src="/img/hollow_black_heart.svg"
                alt=""
                aria-hidden="true"
              />
            </span>
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
            <a className="btn btn-accent btn-sm about__link" href="/about">
              More About Me
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

      <RequestBanner content={content} />
    </main>
  );
}
