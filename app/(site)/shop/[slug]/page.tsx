import { closetStatus, catalogPlacements } from '@/lib/catalog';
import { WishlistButton } from '@/components/WishlistButton';
import { ProductGrid } from '@/components/ProductGrid';
import {
  productPhotos,
  productDescription,
  productIndexable,
  isAmazonProduct,
  experienceLabel,
  experienceStatus,
} from '@/lib/amazon';
import { Video } from '@/components/Video';
import { ArrowIcon } from '@/components/ArrowIcon';
import { ClosetShopLink } from '@/components/ClosetShopLink';
import { PRODUCT_IMAGE } from '@/lib/product-images';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { stegaClean } from 'next-sanity';
import { getDocument, getSettings } from '@/lib/content';
import { pageMetadata, socialImageUrl } from '@/lib/seo';
import { ProductImage } from '@/components/ProductImage';
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
    productDescription(product) || `Details and editorial context for ${product.title}.`,
    `/shop/${encodeURIComponent(slug)}`,
    !productIndexable(product),
  );
  const image = socialImageUrl(productPhotos(product)[0]);
  return image
    ? {
        ...metadata,
        openGraph: {
          ...metadata.openGraph,
          images: [{ url: image, alt: productPhotos(product)[0]?.alt || product.title }],
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
  const approvedPhotos = productPhotos(product);
  const photos = approvedPhotos.length ? approvedPhotos : [undefined];
  const amazon = isAmazonProduct(product);
  const finds = shoppingSection(product) === 'finds';
  const price = shoppingPrice(product);
  const availability = closetStatus(product);
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
            <ProductImage
              key={index}
              image={photo}
              importedImageUrl={product.importedImageUrl}
              title={stegaClean(product.title)}
              width={PRODUCT_IMAGE.width}
              height={PRODUCT_IMAGE.height}
              className="review-detail__main-image"
            />
          ))}
          thumbnails={photos.map((photo, index) => (
            <ProductImage
              key={index}
              image={photo}
              importedImageUrl={product.importedImageUrl}
              title={stegaClean(product.title)}
              width={160}
              height={200}
            />
          ))}
        />
        <section className="review-detail__content" aria-labelledby="item-details">
          <h2 id="item-details" className="headline-md">
            Item details
          </h2>
          {product.brand?.title && <p className="product-card__brand">{product.brand.title}</p>}
          {finds && <p>{experienceLabel(product)}</p>}
          {productDescription(product) && (
            <section aria-labelledby="selection-reason">
              <h3 id="selection-reason">{amazon ? 'Why I picked it' : 'About this item'}</h3>
              <p className="product-description">{productDescription(product)}</p>
            </section>
          )}
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
          {!amazon && availability === 'sold' && <p>This item has sold.</p>}
          {!amazon && availability === 'reserved' && <p>This item is reserved.</p>}
          {!amazon && (!availability || availability === 'unknown') && (
            <p>Availability is not confirmed.</p>
          )}
          {!finds && (
            <p>
              <ClosetShopLink product={product} settings={settings} />
            </p>
          )}
          <WishlistButton id={product._id} title={product.title} />
          {product.archived && (
            <p>This item is archived. Its details remain available for saved items and reviews.</p>
          )}
          {catalogPlacements(product).includes('reviewWishlist') && (
            <p className="body-sm">
              This is on my review wishlist. Gifts are optional and don’t guarantee a review or a
              positive opinion. Please confirm size, color, and delivery details with me before
              buying.
            </p>
          )}
          <ProductAction product={product} settings={settings} />
          {experienceStatus(product) !== 'curated' && product.testedSize && (
            <p>
              {finds && experienceStatus(product) === 'mannequin'
                ? 'Size demonstrated on Shannequin'
                : 'Size personally tested'}
              : {product.testedSize}
            </p>
          )}
          {finds && experienceStatus(product) === 'mannequin' && (
            <p className="body-sm">
              Shown on my size-18 mannequin. This does not establish human comfort, movement, wash
              performance, or durability.
            </p>
          )}
          {finds && experienceStatus(product) === 'curated' && (
            <p className="body-sm">
              I haven’t personally tested this item. My selection notes are research and
              preferences, not first-hand fit findings.
            </p>
          )}
          {experienceStatus(product) !== 'curated' && product.fitObservations && (
            <section aria-labelledby="fit-evidence">
              <h3 id="fit-evidence">
                {finds && experienceStatus(product) === 'mannequin'
                  ? 'Mannequin demonstration'
                  : 'First-hand fit observations'}
              </h3>
              <p className="product-description">{product.fitObservations}</p>
            </section>
          )}
          {product.measurements && (!amazon || product.contentReviewStatus === 'approved') && (
            <section aria-labelledby="measurement-notes">
              <h3 id="measurement-notes">Measurement notes</h3>
              <p className="product-description">{product.measurements}</p>
            </section>
          )}
          {product.sellerSpecifications && (
            <section aria-labelledby="seller-specifications">
              <h3 id="seller-specifications">Seller-reported specifications</h3>
              <p>Reported by the seller; not independently verified.</p>
              <p className="product-description">{product.sellerSpecifications}</p>
            </section>
          )}
          {product.whatToCheck && (
            <section aria-labelledby="shopping-checks">
              <h3 id="shopping-checks">What to check before buying</h3>
              <p className="product-description">{product.whatToCheck}</p>
            </section>
          )}
          {product.editorialReviewedAt &&
            Number.isFinite(Date.parse(stegaClean(product.editorialReviewedAt))) && (
              <p className="body-sm">
                Editorially reviewed:{' '}
                <time dateTime={stegaClean(product.editorialReviewedAt)}>
                  {stegaClean(product.editorialReviewedAt)}
                </time>
              </p>
            )}
          {approvedPhotos.some((photo) => photo.sourceCredit) && (
            <p className="body-sm">
              Image credits:{' '}
              {approvedPhotos
                .map((photo) => photo.sourceCredit)
                .filter(Boolean)
                .join('; ')}
            </p>
          )}
          {product.videoUrl && (
            <Video
              url={product.videoUrl}
              captions={product.videoCaptionsUrl}
              transcript={product.transcript}
            />
          )}
          {!!product.relatedGuides?.length && (
            <nav aria-label="Related guides">
              <h3>Related guides</h3>
              <ul>
                {product.relatedGuides.map((guide) => (
                  <li key={guide.slug}>
                    <Link href={`/blog/${encodeURIComponent(stegaClean(guide.slug))}`}>
                      {guide.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
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
      {product.relatedProducts?.length ? (
        <section aria-labelledby="related-items-title">
          <h2 id="related-items-title">Related products</h2>
          <ProductGrid
            items={product.relatedProducts.filter((p) => !p.archived && closetStatus(p) !== 'sold')}
            settings={settings}
          />
        </section>
      ) : null}
    </main>
  );
}
