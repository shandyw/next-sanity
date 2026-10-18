import type { DocumentContent } from '@/lib/types';
import { ReviewPreview } from './ReviewPreview';
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
  return (
    <ul className={`review-grid ${homepage ? '' : 'reviews-grid'}`}>
      {items.map((item) => (
        <li className="review-card" key={item._id}>
          <ReviewPreview
            item={item}
            heading={homepage ? 'h3' : 'h2'}
            base={base}
            returnTo={returnTo}
          />
        </li>
      ))}
    </ul>
  );
}
