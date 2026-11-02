import { stegaClean } from 'next-sanity';
import Link from 'next/link';
import Image from 'next/image';
import type { DocumentContent, SearchParams } from '@/lib/types';
import { browse, values, first, archiveUrl } from '@/lib/browse';
import { ArchiveFilters, type ArchiveFilter } from './ArchiveFilters';
import { EditorialHero } from './EditorialHero';
import { CardGrid } from './CardGrid';
import { ArrowIcon } from './ArrowIcon';

export function Archive({
  all,
  params,
  kind = 'review',
}: {
  all: DocumentContent[];
  params: SearchParams;
  kind?: 'review' | 'blogPost' | 'favorites';
}) {
  const blog = kind === 'blogPost';
  const catalog = kind === 'review';
  const base = blog ? '/blog' : kind === 'favorites' ? '/my-faves' : '/reviews';
  const { items, count, pages, page } = browse(all, params);
  const hasActiveCatalogFilters =
    Boolean(first(params, 'q').trim()) ||
    (first(params, 'sort') !== '' && first(params, 'sort') !== 'newest') ||
    ['category', 'size', 'brand'].some((name) =>
      values(params, name).some((value) => value.trim()),
    );
  const categories = [
    ...new Map(all.flatMap((d) => d.categories || []).map((c) => [c.slug || c._id, c])).values(),
  ].sort((a, b) => a.title.localeCompare(b.title));
  const brands = [
    ...new Set(all.map((d) => stegaClean(d.brand?.title)).filter((v): v is string => !!v)),
  ];
  const sizes = [
    ...new Set(all.map((d) => d.sizeWorn).filter((v): v is string => !!v)),
  ];
  const currencies = new Set(all.map((d) => stegaClean(d.reviewCurrency)).filter(Boolean));
  const priceSortable =
    currencies.size === 1 && all.some((d) => d.priceWhenReviewed !== undefined);
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
        value: stegaClean(c.slug || c._id),
        label: c.title[0].toUpperCase() + c.title.slice(1),
      })),
    ),
    filter('size', 'Size', sizes.map((value) => ({ value, label: value }))),
    filter('brand', 'Brand', brands.map((value) => ({ value, label: value }))),
  ];
  return (
    <main id="main" className="reviews-page container">
      <EditorialHero
        title={blog ? 'The Blog' : kind === 'favorites' ? 'My Faves' : 'Fashion Reviews'}
        intro={
          blog
            ? 'Stories, outfit finds, and honest takes.'
            : kind === 'favorites'
              ? 'The pieces worth another look.'
              : 'Explore clothing reviews, real-life fit notes, and honest opinions from a size 16–18 perspective. Search the collection to find your next fit.'
        }
      />
      <ArchiveFilters
        stateKey={archiveUrl(base, params, page)}
        base={base}
        catalog={catalog}
        query={first(params, 'q')}
        filters={filters}
        sort={first(params, 'sort')}
        priceSortable={priceSortable}
      />
      <div className="reviews-summary">
        <p role="status">
          {count} {blog ? (count === 1 ? 'post' : 'posts') : count === 1 ? 'review' : 'reviews'} found
          {pages > 1 ? ` · Page ${page} of ${pages}` : ''}
        </p>
        {catalog && hasActiveCatalogFilters && (
          <Link className="archive-clear-filters" href={base} scroll={false}>
            Clear filters
          </Link>
        )}
      </div>
      {count ? (
        <CardGrid
          items={items}
          base={blog ? '/blog' : '/reviews'}
          returnTo={archiveUrl(base, params, page)}
        />
      ) : kind === 'review' ? (
        <section className="reviews-empty reviews-empty--illustrated" aria-labelledby="reviews-empty-title">
          <Image className="reviews-empty__image" src="/img/empty.jpg" alt="" width={1254} height={1254} sizes="(max-width: 767px) 85vw, 35vw" />
          <div className="reviews-empty__copy">
            <p className="reviews-empty__eyebrow">No matches this time</p>
            <h2 id="reviews-empty-title">Nothing fits this search.</h2>
            <p className="reviews-empty__intro">Try a different keyword or clear your filters to see more reviews.</p>
            <div className="reviews-empty__actions">
              <Link className="btn btn-accent btn-lg" href={base} scroll={false}>Clear search &amp; filters</Link>
              <button className="btn btn-ghost btn-lg reviews-empty__request" type="button" data-open-dialog aria-haspopup="dialog">Request a Review <ArrowIcon /></button>
            </div>
          </div>
        </section>
      ) : (
        <section className="reviews-empty">
          <h2>No articles found</h2>
          <p>Try another search or reset your filters.</p>
          <Link className="btn btn-ghost" href={base} scroll={false}>Reset</Link>
        </section>
      )}
      {pages > 1 && (
        <nav className="reviews-pagination" aria-label="Result pages">
          {page > 1 && <Link className="page-link" scroll={false} href={archiveUrl(base, params, page - 1)}>Previous</Link>}
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => Math.max(1, Math.min(page - 3, pages - 6)) + i).map((n) => (
            <Link scroll={false} key={n} className="page-link" aria-current={n === page ? 'page' : undefined} href={archiveUrl(base, params, n)}>{n}</Link>
          ))}
          {page < pages && <Link className="page-link" scroll={false} href={archiveUrl(base, params, page + 1)}>Next</Link>}
        </nav>
      )}
    </main>
  );
}
