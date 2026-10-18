import { ArrowIcon } from '@/components/ArrowIcon';
import { ClosetShopLink } from '@/components/ClosetShopLink';
import { PRODUCT_IMAGE } from '@/lib/product-images';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { stegaClean } from 'next-sanity';
import { getDocument, getSettings } from '@/lib/content';
import { pageMetadata, socialImageUrl } from '@/lib/seo';
import { ContentImage } from '@/components/ContentImage';
import { PhotoGallery } from '@/components/PhotoGallery';
import { EditorialHero } from '@/components/EditorialHero';
import { shoppingSection, shoppingSizes, shoppingPrice } from '@/lib/shopping';
import { ProductAction } from '@/components/ProductAction';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await getDocument('product', slug);
  if (!product) return { title: 'Item not found', robots: { index: false } };
  const metadata = pageMetadata(
    product.title,
    product.description || product.title,
    `/shop/${encodeURIComponent(slug)}`,
    !!product.demo,
  );
  const image = socialImageUrl(product.photos?.[0]);
  return image
    ? {
        ...metadata,
        openGraph: {
          ...metadata.openGraph,
          images: [{ url: image, alt: product.photos?.[0]?.alt || product.title }],
        },
        twitter: { ...metadata.twitter, images: [image] },
      }
    : metadata;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const product = await getDocument('product', slug);
  if (!product) notFound();
  const settings = await getSettings();
  const photos = product.photos?.length ? product.photos : [undefined];
  const finds = shoppingSection(product) === 'finds';
  const price = shoppingPrice(product);
  const availability = stegaClean(product.availability);
  return (
    <main id="main" className="container product-detail">
      <nav className="review-detail__breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> /{' '}
        <Link href={finds ? '/shop/finds' : '/shop/closet'}>
          {finds ? 'Curated Finds' : 'My Closet'}
        </Link>{' '}
        / <span aria-current="page">{product.title}</span>
      </nav>
      <EditorialHero title={product.title} intro="" />
      <div className="review-detail__top">
        <PhotoGallery
          label="Item photographs"
          photos={photos.map((photo, index) => (
            <ContentImage
              key={index}
              image={photo}
              width={PRODUCT_IMAGE.width}
              height={PRODUCT_IMAGE.height}
              className="review-detail__main-image"
            />
          ))}
          thumbnails={photos.map((photo, index) => (
            <ContentImage key={index} image={photo} width={160} height={200} />
          ))}
        />
        <section className="review-detail__content" aria-labelledby="item-details">
          <h2 id="item-details" className="headline-md">
            Item details
          </h2>
          {product.brand?.title && <p className="product-card__brand">{product.brand.title}</p>}
          {finds && (
            <p>
              {product.personallyTried === true
                ? 'Personally tried'
                : 'On my radar · Not yet tried'}
            </p>
          )}
          <p className="product-description">{product.description}</p>
          {shoppingSizes(product).length > 0 && (
            <p>
              {finds ? 'Available sizes' : 'Size'}: {shoppingSizes(product).join(', ')}
            </p>
          )}
          {!finds && product.condition && <p>Condition: {product.condition}</p>}
          {product.categories?.length ? (
            <p>Category: {product.categories.map((category) => category.title).join(', ')}</p>
          ) : null}
          {finds && price !== undefined && product.currency && (
            <p>
              {finds ? 'Retailer price' : 'Listing price'}:{' '}
              {new Intl.NumberFormat('en', {
                style: 'currency',
                currency: stegaClean(product.currency),
              }).format(price)}
            </p>
          )}
          {availability === 'sold' && <p>This item has sold.</p>}
          {availability === 'reserved' && <p>This item is reserved.</p>}
          {(!availability || availability === 'unknown') && <p>Availability is not confirmed.</p>}
          {!finds && (
            <p>
              <ClosetShopLink product={product} settings={settings} />
            </p>
          )}
          <ProductAction product={product} />
          {product.relatedReview && (
            <p>
              <Link
                className="btn btn-ghost"
                href={`/reviews/${encodeURIComponent(stegaClean(product.relatedReview.slug))}`}
              >
                Read the review <ArrowIcon />
              </Link>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
