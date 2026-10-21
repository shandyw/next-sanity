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
export const metadata = pageMetadata(
  'Real Curves. Unfiltered Reviews.',
  'Honest plus-size fashion reviews, clothing finds, and review requests.',
  '/',
);
export default async function Home() {
  const [content, reviews, about] = await Promise.all([
    getContent('homepage'),
    getDocuments('review'),
    getContent('aboutPage'),
  ]);
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
      <RequestBanner content={content} />
    </main>
  );
}
