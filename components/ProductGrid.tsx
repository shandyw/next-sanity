import { stegaClean } from 'next-sanity';
import Link from 'next/link';
import { ArrowIcon } from './ArrowIcon';
import type { DocumentContent, Settings } from '@/lib/types';
import { ClosetShopLink } from './ClosetShopLink';
import { closetShopUrl } from '@/lib/urls';
import { ContentImage } from './ContentImage';
import { ImageCarousel } from './ImageCarousel';
import { WishlistButton } from './WishlistButton';
import { closetPlatform, shoppingSection, shoppingPrice, shoppingSizes } from '@/lib/shopping';
import { ProductResults } from './ProductResults';
import { PRODUCT_IMAGE } from '@/lib/product-images';
export function ProductGrid({
  items,
  settings,
}: {
  items: DocumentContent[];
  settings?: Settings;
}) {
  return (
    <ProductResults resultKey={JSON.stringify(items.map((item) => item._id))}>
      {items.map((d) => (
        <li className="review-card" key={d._id}>
          <ProductCard product={d} settings={settings} />
        </li>
      ))}
    </ProductResults>
  );
}

export function ProductCard({
  product: d,
  settings,
}: {
  product: DocumentContent;
  settings?: Settings;
}) {
  const finds = shoppingSection(d) === 'finds';
  const price = shoppingPrice(d);
  const detailUrl = `/shop/${encodeURIComponent(stegaClean(d.slug))}`;
  const platform = closetPlatform(d);
  const hasClosetLink =
    !finds &&
    !d.demo &&
    Boolean(
      closetShopUrl(
        stegaClean(platform === 'poshmark' ? settings?.poshmarkShopUrl : settings?.vintedShopUrl),
        platform,
      ),
    );
  return (
    <article className="product-card">
      <ImageCarousel
        title={stegaClean(d.title)}
        href={detailUrl}
        images={(d.photos?.length ? d.photos.slice(0, 5) : [undefined]).map((image, index) => (
          <ContentImage
            key={index}
            image={image}
            width={PRODUCT_IMAGE.width}
            height={PRODUCT_IMAGE.height}
          />
        ))}
      >
        <WishlistButton id={d._id} title={d.title} />
      </ImageCarousel>
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
      <p className="product-card__description">{d.description}</p>
      {finds && price !== undefined && d.currency && (
        <p>
          {finds ? 'Retailer price' : 'Listing price'}:{' '}
          {new Intl.NumberFormat('en', {
            style: 'currency',
            currency: stegaClean(d.currency),
          }).format(price)}
        </p>
      )}
      {hasClosetLink && (
        <p>
          <ClosetShopLink product={d} settings={settings} />
        </p>
      )}
      <Link className="btn btn-accent" href={detailUrl}>
        Learn More <ArrowIcon />
      </Link>
      {d.relatedReview && (
        <a className="review-card__cta" href={`/reviews/${d.relatedReview.slug}`}>
          Read {d.relatedReview.title} <ArrowIcon />
        </a>
      )}
    </article>
  );
}
