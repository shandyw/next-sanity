import { stegaClean } from 'next-sanity';
import Link from 'next/link';
import type { DocumentContent, SearchParams } from '@/lib/types';
import { safeExternal } from '@/lib/urls';
import { browse, values, first, archiveUrl } from '@/lib/browse';
import { ArchiveFilters, type ArchiveFilter } from './ArchiveFilters';
import { InnerHero } from './InnerHero';
import { CardGrid } from './CardGrid';
import { ProductGrid } from './ProductGrid';
import { sectionProducts, shoppingSizes, type ShoppingSection } from '@/lib/shopping';
export function Archive({
  all: documents,
  params,
  kind = 'review',
  shopUrl,
  section = 'closet',
  shopBase,
}: {
  all: DocumentContent[];
  params: SearchParams;
  kind?: 'review' | 'blogPost' | 'product' | 'favorites';
  shopUrl?: string;
  section?: ShoppingSection;
  shopBase?: string;
}) {
  const shop = kind === 'product';
  const blog = kind === 'blogPost';
  const all = shop ? sectionProducts(documents, section) : documents;
  const base = shop
    ? shopBase || '/shop'
    : blog
      ? '/blog'
      : kind === 'favorites'
        ? '/my-faves'
        : '/reviews';
  const { items, count, pages, page } = browse(all, params, shop);
  const categories = [
    ...new Map(all.flatMap((d) => d.categories || []).map((c) => [c.slug || c._id, c])).values(),
  ].sort((a, b) => a.title.localeCompare(b.title));
  const brands = [
    ...new Set(all.map((d) => stegaClean(d.brand?.title)).filter((v): v is string => !!v)),
  ];
  const sizes = [
    ...new Set(
      all
        .flatMap((d) => (shop ? shoppingSizes(d) : d.sizeWorn ? [d.sizeWorn] : []))
        .filter((v): v is string => !!v),
    ),
  ];
  const priceSupported = all.some(
    (d) => (shop ? d.listingPrice : d.priceWhenReviewed) !== undefined,
  );
  const currencies = [
    ...new Set(all.map((d) => stegaClean(shop ? d.currency : d.reviewCurrency)).filter(Boolean)),
  ];
  const priceSortable = priceSupported && currencies.length === 1;
  const filter = (
    name: string,
    label: string,
    options: { value: string; label: string }[],
  ): ArchiveFilter => ({ name, label, options, selected: values(params, name) });
  const filters = [
    filter(
      'category',
      'Category',
      categories.map((c) => ({
        value: c.slug || c._id,
        label: c.title[0].toUpperCase() + c.title.slice(1),
      })),
    ),
    filter(
      'size',
      shop && section === 'finds' ? 'Available sizes' : 'Size',
      sizes.map((value) => ({ value, label: value })),
    ),
    filter(
      'brand',
      'Brand',
      brands.map((value) => ({ value, label: value })),
    ),
  ];
  if (shop && section === 'closet')
    filters.push(
      filter(
        'condition',
        'Condition',
        [...new Set(all.map((d) => stegaClean(d.condition)).filter((v): v is string => !!v))].map(
          (value) => ({ value, label: value }),
        ),
      ),
    );
  if (shop && section === 'finds') {
    filters.push(
      filter(
        'retailer',
        'Retailer',
        [...new Set(all.map((d) => stegaClean(d.retailer)).filter((v): v is string => !!v))].map(
          (value) => ({ value, label: value }),
        ),
      ),
    );
    filters.push(
      filter('tried', 'Personally tried', [
        { value: 'yes', label: 'Personally tried' },
        { value: 'no', label: 'Not yet tried' },
      ]),
    );
  }
  if (!shop && !blog && all.some((d) => d.format))
    filters.push(
      filter('format', 'Format', [
        { value: 'written', label: 'Written' },
        { value: 'video', label: 'Video' },
      ]),
    );
  const highestPrice = Math.max(
    100,
    ...all.map((d) => (shop ? d.listingPrice : d.priceWhenReviewed) || 0),
    Number(first(params, 'min_price')) || 0,
    Number(first(params, 'max_price')) || 0,
  );
  return (
    <main id="main" className="reviews-page container">
      <InnerHero
        title={
          shop
            ? section === 'finds'
              ? 'Curated Finds'
              : 'My Vinted Closet'
            : blog
              ? 'The Blog'
              : kind === 'favorites'
                ? 'My Faves'
                : 'Fashion Reviews'
        }
        intro={
          shop
            ? section === 'finds'
              ? 'Pieces that caught my eye'
              : 'Shop pieces from my own wardrobe. Purchase securely on Vinted.'
            : blog
              ? 'Stories, outfit finds, and honest takes.'
              : kind === 'favorites'
                ? 'The pieces worth another look.'
                : 'Explore clothing reviews, real-life fit notes, and honest opinions from a size 16–18 perspective. Search the collection to find your next fit.'
        }
      />
      {shop && (
        <nav className="shopping-sections" aria-label="Shopping section">
          <Link
            href="/shop/closet"
            scroll={false}
            aria-current={section === 'closet' ? 'page' : undefined}
          >
            <strong>My Vinted Closet</strong>
            <span>Shop pieces from my own wardrobe.</span>
          </Link>
          <Link
            href="/shop/finds"
            scroll={false}
            aria-current={section === 'finds' ? 'page' : undefined}
          >
            <strong>Curated Finds</strong>
            <span>Pieces that caught my eye.</span>
          </Link>
        </nav>
      )}
      {shop && all.some((d) => d.demo) && (
        <p className="demo-notice">
          Local shop preview: sample items, prices, and availability. Hanger images are
          placeholders. These items cannot be purchased.
        </p>
      )}
      {shop && section === 'closet' && safeExternal(shopUrl) && (
        <p>
          <a className="btn btn-accent" href={shopUrl} target="_blank" rel="noopener noreferrer">
            Visit my Vinted closet
          </a>
        </p>
      )}
      <ArchiveFilters
        stateKey={archiveUrl(base, params, page)}
        base={base}
        shop={shop}
        curated={shop && section === 'finds'}
        query={first(params, 'q')}
        filters={filters}
        sort={first(params, 'sort')}
        price={
          priceSortable
            ? {
                currency: currencies[0]!,
                ceiling: Number.isFinite(highestPrice) ? Math.ceil(highestPrice) : 100,
                min: first(params, 'min_price'),
                max: first(params, 'max_price'),
              }
            : undefined
        }
      />
      <div className="reviews-summary">
        <p role="status">
          {count}{' '}
          {shop
            ? count === 1
              ? 'item'
              : 'items'
            : blog
              ? count === 1
                ? 'post'
                : 'posts'
              : count === 1
                ? 'review'
                : 'reviews'}{' '}
          found
          {pages > 1 ? ` · Page ${page} of ${pages}` : ''}
        </p>
      </div>
      {count ? (
        shop ? (
          <ProductGrid items={items} />
        ) : (
          <CardGrid
            items={items}
            base={blog ? '/blog' : '/reviews'}
            returnTo={archiveUrl(base, params, page)}
          />
        )
      ) : (
        <section className="reviews-empty">
          <h2>No {shop ? 'items' : 'articles'} found</h2>
          <p>Try another search or reset your filters.</p>
          <Link className="btn btn-ghost" href={base} scroll={false}>
            Reset
          </Link>
        </section>
      )}
      {pages > 1 && (
        <nav className="reviews-pagination" aria-label="Result pages">
          {page > 1 && (
            <Link className="page-link" scroll={false} href={archiveUrl(base, params, page - 1)}>
              Previous
            </Link>
          )}
          {Array.from(
            { length: Math.min(pages, 7) },
            (_, i) => Math.max(1, Math.min(page - 3, pages - 6)) + i,
          ).map((n) => (
            <Link
              scroll={false}
              key={n}
              className="page-link"
              aria-current={n === page ? 'page' : undefined}
              href={archiveUrl(base, params, n)}
            >
              {n}
            </Link>
          ))}
          {page < pages && (
            <Link className="page-link" scroll={false} href={archiveUrl(base, params, page + 1)}>
              Next
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
