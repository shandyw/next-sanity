import { getContent, demoEnabled } from '@/lib/content';
import { ContentImage } from '@/components/ContentImage';
import { EditorialHero } from '@/components/EditorialHero';
import { Shannequin } from '@/components/Shannequin';
import {
  ShannequinMeasurements,
  ShannequinMeasurementList,
} from '@/components/ShannequinMeasurements';
import { RequestBanner } from '@/components/RequestBanner';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'About CurvyGirlReviews',
  'Meet Shandy, the woman behind the honest size 16–18 fashion reviews.',
  '/about',
);
const defaultPromises = [
  { title: 'Real-life fit', description: 'How it sits, stretches, and feels on a body like mine.' },
  {
    title: 'Honest opinions',
    description: 'The good, the awkward, and the ‘nothing like the photo.’',
  },
  { title: 'Clothes worth your time', description: 'A closer look before you spend your money.' },
];
export default async function About() {
  const content = await getContent('aboutPage');
  return (
    <main id="main" className="about-page__main">
      <div className="container">
        <EditorialHero
          title={content.title || 'About CurvyGirlReviews'}
          intro={
            content.intro ||
            'Meet Shandy, the size 16–18 woman behind the reviews. Honest try-ons, realistic fit notes, and zero sugarcoating about clothes that don’t live up to their pictures.'
          }
          eyebrow="Real curves. Honest reviews."
          layout={content.heroVideoUrl ? 'video' : 'portrait'}
          videoSrc={content.heroVideoUrl}
          copyTone={content.heroCopyTone}
        />
      </div>
      <section>
        <div className="container">
          <div className="about-page__section" aria-labelledby="aboutSectionTitle">
            <figure className="about-page__portrait">
              <ShannequinMeasurements
                measurements={content.myMeasurements}
                hasImage={Boolean(content.portrait?.asset?._ref)}
              >
                <div className="about-page__photo-frame">
                  <ContentImage
                    image={content.portrait}
                    demoSrc="https://images.unsplash.com/photo-1475178626620-a4d074967452?w=680&amp;h=680&amp;fit=crop&amp;q=80&amp;fm=jpg"
                    width={680}
                    height={1000}
                    preserveFullImage
                    sizes="(max-width: 767px) 90vw, 50vw"
                    priority
                  />
                </div>
              </ShannequinMeasurements>
              {demoEnabled && !content.portrait && (
                <figcaption>Placeholder photo — not Shandy.</figcaption>
              )}
            </figure>
            <div className="about-page__copy">
              <p className="about-page__eyebrow">{content.eyebrow || 'HEY, I’M SHANDY'}</p>
              <h2 id="aboutSectionTitle">{content.heading || 'A little about me'}</h2>
              {(
                content.paragraphs || [
                  'I’m not an influencer. I’m a size 16–18 woman who wants clothes that look good, feel good, and actually look like their pictures.',
                  'This is my little corner of the internet for honest try-ons, realistic fit notes, and calling out catfish clothes. If something doesn’t work, I’ll tell you.',
                  'I’m here to represent real bodies—including mine.',
                ]
              ).map((p: string) => (
                <p className="intro" key={p}>
                  {p}
                </p>
              ))}
              <div className="about-page__measurement-hint">
                {content.portrait?.asset?._ref && (
                  <div className="shannequin__measurement-hint">
                    <span aria-hidden="true">+</span>
                    <div>
                      <strong>Get to know my measurements</strong>
                      <p>Hover or tap a point on my photo to explore.</p>
                    </div>
                  </div>
                )}
                <ShannequinMeasurementList
                  measurements={content.myMeasurements}
                  summaryLabel="View all my measurements"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="about-page__promises" aria-labelledby="aboutPromisesTitle">
        <div className="container">
          <h2 id="aboutPromisesTitle">What you’ll find here</h2>
          <ol className="about-page__promise-list">
            {(content.promises || defaultPromises).map((p, i) => (
              <li key={p.title}>
                <span className="about-page__number" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="headline-md">{p.title}</h3>
                <p className="intro">{p.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section>
        <div className="container">
          <hr className="page__divider" />
        </div>
      </section>
      <Shannequin
        image={content.shannequinImage}
        measurements={content.shannequinMeasurements}
        about
      />

      <RequestBanner content={content} />
    </main>
  );
}
