import { stegaClean } from 'next-sanity';
import Link from 'next/link';
import type { DocumentContent } from '@/lib/types';
import { ProductAction } from './ProductAction';
import { ContentImage } from './ContentImage';
import { WishlistButton } from './WishlistButton';
import { shoppingSection, shoppingPrice, shoppingSizes } from '@/lib/shopping';
import { ProductResults } from './ProductResults';
export function ProductGrid({ items }: { items: DocumentContent[] }) {
  return (
    <ProductResults resultKey={JSON.stringify(items.map((item) => item._id))}>
      {items.map((d) => (
        <li className="review-card" key={d._id}>
          <ProductCard product={d} />
        </li>
      ))}
    </ProductResults>
  );
}

export function ProductCard({ product: d }: { product: DocumentContent }) {
  const finds = shoppingSection(d) === 'finds';
  const price = shoppingPrice(d);
  return (
    <article>
      <div className="review-card__media">
        <Link
          className="review-card__media-link"
          href={`/shop/${encodeURIComponent(stegaClean(d.slug))}`}
          aria-label={`View ${stegaClean(d.title)}`}
        >
          <ContentImage image={d.photos?.[0]} width={600} height={536} />
        </Link>
        <WishlistButton id={d._id} title={d.title} />
      </div>
      {d.brand?.title?.trim() && <p className="product-card__brand">{d.brand.title}</p>}
      {finds && (
        <p className="body-sm product-experience">
          {d.personallyTried === true ? 'Personally tried' : 'On my radar · Not yet tried'}
        </p>
      )}
      <h2 className="review-card__title">{d.title}</h2>
      <p className="review-card__meta">
        {[shoppingSizes(d).join(', '), finds ? d.retailer : d.condition]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <p>{d.description}</p>
      {price !== undefined && d.currency && (
        <p>
          {finds ? 'Retailer price' : 'Listing price'}:{' '}
          {new Intl.NumberFormat('en', {
            style: 'currency',
            currency: stegaClean(d.currency),
          }).format(price)}
        </p>
      )}
      <ProductAction product={d} />
      {d.relatedReview && (
        <a className="review-card__cta" href={`/reviews/${d.relatedReview.slug}`}>
          Read {d.relatedReview.title}
        </a>
      )}
    </article>
  );
}
