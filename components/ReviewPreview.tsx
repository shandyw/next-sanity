import type { DocumentContent } from '@/lib/types';
import { ImageCarousel } from './ImageCarousel';
import { ContentImage } from './ContentImage';
import { ArrowIcon } from './ArrowIcon';

export function ReviewPreview({
  item,
  heading = 'h2',
  base = '/reviews',
  returnTo,
  truncateBlurb = false,
}: {
  item: DocumentContent;
  heading?: 'h2' | 'h3';
  base?: string;
  returnTo?: string;
  truncateBlurb?: boolean;
}) {
  const Heading = heading;
  const href = `${base}/${encodeURIComponent(item.slug)}${returnTo ? '?from=' + encodeURIComponent(returnTo) : ''}`;
  const words = item.excerpt?.trim().split(/\s+/) || [];
  const blurb =
    truncateBlurb && words.length > 15 ? `${words.slice(0, 15).join(' ')}…` : item.excerpt;
  return (
    <article className="review-card__body review-preview">
      {item.demo && <p className="body-sm">Illustrative sample review</p>}
      <ImageCarousel
        title={item.title}
        href={href}
        images={(item.photos?.length ? item.photos : [item.featuredImage]).map((image, index) => (
          <ContentImage key={index} image={image} width={600} height={750} />
        ))}
      />
      {item.brand?.title?.trim() && <p className="review-card__eyebrow">{item.brand.title}</p>}
      <Heading className="review-card__title headline-lg">
        <a className="review-card__title-link" href={href}>
          <span className="review-preview__title-backing">{item.title}</span>
        </a>
      </Heading>
      {blurb && <p className="review-card__blurb">{blurb}</p>}
      {item.sizeWorn && <p className="review-card__meta">Tried in size {item.sizeWorn}</p>}
      <a
        className="text-link text-link--editorial"
        href={href}
        aria-label={`${base === '/blog' ? 'Read the post' : 'Read the review'}: ${item.title}`}
      >
        <span>{base === '/blog' ? 'Read the post' : 'Read the review'}</span> <ArrowIcon />
      </a>
    </article>
  );
}
