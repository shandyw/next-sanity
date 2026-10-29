import { productPhotos, productDescription, experienceLabel } from '@/lib/amazon';
import { stegaClean } from 'next-sanity';
import Link from 'next/link';
import { ArrowIcon } from './ArrowIcon';
import type { DocumentContent, Settings } from '@/lib/types';
import { ClosetShopLink } from './ClosetShopLink';
import { closetShopUrl } from '@/lib/urls';
import { ProductImage } from './ProductImage';
import { ImageCarousel } from './ImageCarousel';
import { WishlistButton } from './WishlistButton';
import { shoppingSection, shoppingPrice, shoppingSizes } from '@/lib/shopping';
import { PRODUCT_IMAGE } from '@/lib/product-images';

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
  const hasClosetLink =
    !finds && !d.demo && Boolean(closetShopUrl(stegaClean(settings?.vintedShopUrl)));
  const brand = d.brand?.title?.trim();
  const description = productDescription(d);
  const photos = productPhotos(d).slice(0, 5);
  return (
    <article className="product-card">
      <ImageCarousel
        title={stegaClean(d.title)}
        href={detailUrl}
        images={(photos.length ? photos : [undefined]).map((image, index) => (
          <ProductImage
            key={index}
            image={image}
            importedImageUrl={d.importedImageUrl}
            title={stegaClean(d.title)}
            width={PRODUCT_IMAGE.width}
            height={PRODUCT_IMAGE.height}
          />
        ))}
      >
        <WishlistButton id={d._id} title={d.title} />
      </ImageCarousel>
      <p className="product-card__brand" aria-hidden={!brand || undefined}>
        {brand || '\u00a0'}
      </p>
      <h2 className="review-card__title">{d.title}</h2>
      <p className="review-card__meta">
        {[shoppingSizes(d).join(', '), finds ? d.retailer : d.condition]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {finds && <p className="body-sm product-experience">{experienceLabel(d)}</p>}
      {description && <p className="product-card__description">{description}</p>}
      {finds && price !== undefined && (
        <p>
          Retailer price:{' '}
          {new Intl.NumberFormat('en', {
            style: 'currency',
            currency: stegaClean(d.currency || 'USD'),
          }).format(price)}
        </p>
      )}
      <div className="product-card__actions">
        {/* {hasClosetLink && (
          <p>
            <ClosetShopLink product={d} settings={settings} />
          </p>
        )} */}
        <Link className="btn btn-accent" href={detailUrl}>
          View item <ArrowIcon />
        </Link>
        {d.relatedReview && (
          <a className="review-card__cta" href={`/reviews/${d.relatedReview.slug}`}>
            Read my review <ArrowIcon />
          </a>
        )}
      </div>
    </article>
  );
}
