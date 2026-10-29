import { ContentImage } from '@/components/ContentImage';
import { HeroEntrance } from '@/components/HeroEntrance';
import Image from 'next/image';
import { stegaClean } from 'next-sanity';
import type { ReactNode } from 'react';
import type { ContentPhoto } from '@/lib/types';
import { getHeroImages } from '@/lib/hero-images';
import { ArrowIcon } from './ArrowIcon';
import { ExternalLinkIcon } from './ExternalLinkIcon';

export async function EditorialHero({
  title,
  emphasis,
  intro,
  eyebrow = 'CurvyGirlReviews',
  disclaimer,
  cta,
  scriptAccent,
  layout = 'portrait',
  mainPhoto,
  smallPhoto,
  landscapePhoto,
  media,
}: {
  title: string;
  emphasis?: string;
  intro?: string;
  eyebrow?: string;
  disclaimer?: ReactNode;
  cta?: { label: string; href: string };
  scriptAccent?: string;
  layout?: 'portrait' | 'landscape';
  mainPhoto?: ContentPhoto;
  smallPhoto?: ContentPhoto;
  landscapePhoto?: ContentPhoto;
  media?: ReactNode;
}) {
  const landscape =
    !media &&
    layout === 'landscape' &&
    Boolean(landscapePhoto?.asset?._ref || landscapePhoto?.demoSrc);
  const images = media || landscape ? [] : await getHeroImages(stegaClean(title));
  const accentIndex =
    emphasis && scriptAccent ? stegaClean(emphasis).indexOf(stegaClean(scriptAccent)) : -1;
  const photo = (image: ContentPhoto | undefined, src: string | undefined, main: boolean) => {
    const sizes = main ? '(max-width: 767px) 58vw, 30vw' : '(max-width: 767px) 49vw, 25vw';
    if (image?.asset?._ref)
      return <ContentImage image={image} width={900} height={1500} sizes={sizes} priority />;
    // Pool photographs are decorative editorial imagery, not photographs of the reviewed item.
    if (src)
      return (
        <Image
          src={src}
          alt=""
          width={900}
          height={1100}
          sizes={sizes}
          loading="eager"
          fetchPriority={main ? 'high' : 'auto'}
        />
      );
    return (
      <div className="image-placeholder" style={{ aspectRatio: '9 / 11' }} aria-hidden="true" />
    );
  };
  return (
    <section
      className={`editorial-hero${emphasis ? ' editorial-hero--emphasized' : ''}${landscape ? ' editorial-hero--landscape' : ''}`}
      aria-labelledby="heroHeading"
    >
      <HeroEntrance>
        <div className="editorial-hero__copy">
          <p className="editorial-hero__eyebrow" data-hero-part="eyebrow">
            {eyebrow}
          </p>
          <h1 id="heroHeading" data-hero-part="heading">
            <span className="editorial-hero__line">{title}</span>
            {emphasis && (
              <span className="editorial-hero__words">
                {accentIndex >= 0 && scriptAccent ? (
                  <>
                    {emphasis.slice(0, accentIndex)}
                    <span className="editorial-hero__emphasis script-accent">
                      <span className="editorial-hero__accent-text">{scriptAccent}</span>
                    </span>
                    <span className="editorial-hero__ending">
                      {emphasis.slice(accentIndex + scriptAccent.length)}
                    </span>
                  </>
                ) : (
                  <span className="editorial-hero__emphasis">
                    <span className="editorial-hero__accent-text">{emphasis}</span>
                  </span>
                )}
              </span>
            )}
          </h1>
          {intro && (
            <p className="editorial-hero__intro" data-hero-part="description">
              {intro}
            </p>
          )}
          {disclaimer && (
            <div className="editorial-hero__disclaimer" data-hero-part="description">
              {disclaimer}
            </div>
          )}
          {cta && (
            <a
              className="btn btn-accent btn-lg editorial-hero__cta"
              href={cta.href}
              data-hero-part="action"
            >
              {cta.label}
              {/^https?:\/\//i.test(cta.href) ? (
                <ExternalLinkIcon />
              ) : (
                <ArrowIcon className="editorial-hero__cta-arrow" />
              )}
            </a>
          )}
        </div>
        {media || (
          <div
            className={`editorial-hero__collage${landscape ? ' editorial-hero__collage--landscape' : ''}`}
          >
            {landscape ? (
              <figure
                className="editorial-hero__photo editorial-hero__photo--landscape"
                data-hero-part="main-photo"
              >
                <ContentImage
                  image={landscapePhoto}
                  width={1400}
                  height={1000}
                  preserveFullImage
                  sizes="(max-width: 767px) 90vw, 52vw"
                  priority
                />
              </figure>
            ) : (
              <>
                <figure
                  className="editorial-hero__photo editorial-hero__photo--main"
                  data-hero-part="main-photo"
                >
                  {photo(mainPhoto, images[0], true)}
                </figure>
                <figure
                  className="editorial-hero__photo editorial-hero__photo--small"
                  data-hero-part="small-photo"
                >
                  {photo(smallPhoto, images[1] || images[0], false)}
                </figure>
              </>
            )}
          </div>
        )}
      </HeroEntrance>
    </section>
  );
}
