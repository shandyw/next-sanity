import { getContent, demoEnabled } from '@/lib/content';
import { ContentImage } from '@/components/ContentImage';
import { InnerHero } from '@/components/InnerHero';
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
        <InnerHero
          title={content.title || 'About CurvyGirlReviews'}
          intro={
            content.intro ||
            'Meet Shandy, the size 16–18 woman behind the reviews. Honest try-ons, realistic fit notes, and zero sugarcoating about clothes that don’t live up to their pictures.'
          }
          eyebrow="Real curves. Honest reviews."
        />
      </div>
      <section className="container about-page__intro" aria-labelledby="aboutIntroTitle">
        <div className="about-page__copy">
          <p className="about-page__eyebrow">{content.eyebrow || 'HEY, I’M SHANDY'}</p>
          <h2 className="headline-lg" id="aboutIntroTitle">
            {content.heading || 'A little about me'}
          </h2>
          {(
            content.paragraphs || [
              'I’m not an influencer. I’m a size 16–18 woman who wants clothes that look good, feel good, and actually look like their pictures.',
              'This is my little corner of the internet for honest try-ons, realistic fit notes, and calling out catfish clothes. If something doesn’t work, I’ll tell you.',
              'I’m here to represent real bodies—including mine.',
            ]
          ).map((p: string) => (
            <p className="body-lg" key={p}>
              {p}
            </p>
          ))}
        </div>
        <figure className="about-page__portrait">
          <div className="about-page__photo-frame">
            <ContentImage
              image={content.portrait}
              demoSrc="https://images.unsplash.com/photo-1475178626620-a4d074967452?w=680&amp;h=680&amp;fit=crop&amp;q=80&amp;fm=jpg"
              width={680}
              height={680}
              priority
            />
          </div>
          <span className="about-page__note">Keeping it real.</span>
          <span className="about-page__annotation">Real body. Real opinions.</span>
          <img
            className="about-page__heart"
            src="/img/hollow_pink_heart.svg"
            alt=""
            aria-hidden="true"
            width="28"
            height="32"
          />
          {demoEnabled && !content.portrait && (
            <figcaption>Placeholder photo — not Shandy.</figcaption>
          )}
        </figure>
      </section>
      <section className="container about-page__promises" aria-labelledby="aboutPromisesTitle">
        <h2 className="headline-lg" id="aboutPromisesTitle">
          What you’ll find here
        </h2>
        <ol className="about-page__promise-list">
          {(content.promises || defaultPromises).map((p, i) => (
            <li key={p.title}>
              <span className="about-page__number" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="headline-md">{p.title}</h3>
              <p className="body-lg">{p.description}</p>
            </li>
          ))}
        </ol>
        <img
          className="about-page__promise-heart"
          src="/img/hollow_yellow_heart.svg"
          alt=""
          aria-hidden="true"
          width="34"
          height="38"
        />
      </section>
      <RequestBanner content={content} />
    </main>
  );
}
