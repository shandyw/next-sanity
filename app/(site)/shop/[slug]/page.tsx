import Link from 'next/link';
import { notFound } from 'next/navigation';
import { stegaClean } from 'next-sanity';
import { getDocument } from '@/lib/content';
import { pageMetadata, socialImageUrl } from '@/lib/seo';
import { ContentImage } from '@/components/ContentImage';
import { PhotoGallery } from '@/components/PhotoGallery';
import { InnerHero } from '@/components/InnerHero';
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
  const photos = product.photos?.length ? product.photos : [undefined];
  const finds = shoppingSection(product) === 'finds';
  const price = shoppingPrice(product);
  const availability = stegaClean(product.availability);
  return (
    <main id="main" className="container">
      <nav className="review-detail__breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> /{' '}
        <Link href={finds ? '/shop/finds' : '/shop/closet'}>
          {finds ? 'Curated Finds' : 'My Vinted Closet'}
        </Link>{' '}
        / <span aria-current="page">{product.title}</span>
      </nav>
      <InnerHero title={product.title} intro="" />
      <div className="review-detail__top">
        <PhotoGallery
          label="Item photographs"
          photos={photos.map((photo, index) => (
            <ContentImage
              key={index}
              image={photo}
              width={900}
              height={900}
              className="review-detail__main-image"
            />
          ))}
          thumbnails={photos.map((photo, index) => (
            <ContentImage key={index} image={photo} width={180} height={180} />
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
          <p>{product.description}</p>
          {shoppingSizes(product).length > 0 && (
            <p>
              {finds ? 'Available sizes' : 'Size'}: {shoppingSizes(product).join(', ')}
            </p>
          )}
          {!finds && product.condition && <p>Condition: {product.condition}</p>}
          {product.categories?.length ? (
            <p>Category: {product.categories.map((category) => category.title).join(', ')}</p>
          ) : null}
          {price !== undefined && product.currency && (
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
          <ProductAction product={product} />
          {product.relatedReview && (
            <p>
              <Link
                className="btn btn-ghost"
                href={`/reviews/${encodeURIComponent(stegaClean(product.relatedReview.slug))}`}
              >
                Read the review
              </Link>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
