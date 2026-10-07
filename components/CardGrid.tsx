import type { DocumentContent } from '@/lib/types';
import { ImageCarousel } from './ImageCarousel';
import { ContentImage } from './ContentImage';
export function CardGrid({
  items,
  homepage = false,
  base = '/reviews',
  returnTo,
}: {
  items: DocumentContent[];
  homepage?: boolean;
  base?: string;
  returnTo?: string;
}) {
  if (!items.length)
    return (
      <p className="body-md">
        New {base === '/blog' ? 'posts' : 'reviews'} are on their way. Check back soon.
      </p>
    );
  const Heading = homepage ? 'h3' : 'h2';
  return (
    <ul className={`review-grid ${homepage ? '' : 'reviews-grid'}`}>
      {items.map((d) => {
        const href = `${base}/${encodeURIComponent(d.slug)}${returnTo ? '?from=' + encodeURIComponent(returnTo) : ''}`;
        return (
          <li className="review-card" key={d._id}>
            <article className="review-card__body">
              <ImageCarousel
                title={d.title}
                href={href}
                images={(d.photos?.length ? d.photos : [d.featuredImage]).map((image, i) => (
                  <ContentImage key={i} image={image} width={600} height={536} />
                ))}
              />
              <Heading className="review-card__title">
                <a className="review-card__title-link" href={href}>
                  {d.title}
                </a>
              </Heading>
              {(d.brand || d.sizeWorn) && (
                <p className="review-card__meta">
                  {[d.brand?.title, d.sizeWorn && `Size ${d.sizeWorn}`].filter(Boolean).join(' · ')}
                </p>
              )}
              {(homepage || base === '/blog') && d.categories?.length ? (
                <p className="review-card__category">
                  {d.categories.map((c) => c.title).join(', ')}
                </p>
              ) : null}
              <p className="review-card__blurb">{d.excerpt}</p>
              <a className="review-card__cta" href={href}>
                {base === '/blog'
                  ? 'Read Post'
                  : d.format === 'video'
                    ? 'Watch Review'
                    : d.format === 'written' && !d.demo
                      ? 'Read Review'
                      : 'View Review'}
              </a>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
