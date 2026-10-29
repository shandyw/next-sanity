import type { DocumentContent } from '@/lib/types';
import { ImageCarousel } from './ImageCarousel';
import { ContentImage } from './ContentImage';
import { ArrowIcon } from './ArrowIcon';
import { WishlistButton } from './WishlistButton';

export function ReviewPreview({
  item,
  heading = 'h2',
  base = '/reviews',
  returnTo,
}: {
  item: DocumentContent;
  heading?: 'h2' | 'h3';
  base?: string;
  returnTo?: string;
}) {
  const Heading = heading;
  const href = `${base}/${encodeURIComponent(item.slug)}${returnTo ? '?from=' + encodeURIComponent(returnTo) : ''}`;
  return (
    <article className="review-card__body review-preview">
      {!item.demo && <WishlistButton id={item._id} title={item.title} />}
      {item.demo && <p className="body-sm">Illustrative sample review</p>}
      <ImageCarousel
        title={item.title}
        href={href}
        images={(item.photos?.length ? item.photos : [item.featuredImage]).map((image, index) => (
          <ContentImage key={index} image={image} width={600} height={750} />
        ))}
      />
      {item.brand?.title?.trim() && (
        <p className="product-card__brand review-card__brand">{item.brand.title}</p>
      )}
      <Heading className="review-card__title">
        <a className="review-card__title-link" href={href}>
          <span className="review-preview__title-backing">{item.title}</span>
        </a>
      </Heading>
      {item.excerpt && <p className="review-card__blurb">{item.excerpt}</p>}
      {item.sizeWorn && <p className="review-card__meta">Tried in size {item.sizeWorn}</p>}
      <a
        className="review-card__cta"
        href={href}
        aria-label={`${base === '/blog' ? 'Read the post' : 'Read the review'}: ${item.title}`}
      >
        {base === '/blog' ? 'Read the post' : 'Read the review'} <ArrowIcon />
      </a>
    </article>
  );
}
