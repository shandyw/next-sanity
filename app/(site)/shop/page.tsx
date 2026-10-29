import Link from 'next/link';
import { ContentImage } from '@/components/ContentImage';
import { WishlistButton } from '@/components/WishlistButton';
import { getLooks, lookImage, lookOccasionLabel, lookOccasionLabels } from '@/lib/looks';
import type { SearchParams } from '@/lib/types';
import { pageMetadata } from '@/lib/seo';

type Props = { searchParams: Promise<SearchParams> };

export async function generateMetadata({ searchParams }: Props) {
  return pageMetadata(
    'Shop the Looks',
    'Browse editorial outfits and discover shoppable Amazon Finds.',
    '/shop',
    Boolean((await searchParams).occasion),
  );
}

export default async function ShopPage({ searchParams }: Props) {
  const occasion = (await searchParams).occasion;
  const active = typeof occasion === 'string' && occasion in lookOccasionLabels ? occasion : '';
  const looks = await getLooks();
  const visible = active ? looks.filter((look) => look.occasion === active) : looks;

  return (
    <main id="main" className="container looks-archive">
      <header className="looks-heading">
        <p className="eyebrow">SHOP</p>
        <h1>Shop the Looks</h1>
        <p>Outfits, ideas, and Finds to make them your own.</p>
      </header>
      <nav className="look-filters" aria-label="Filter Looks by occasion">
        <Link href="/shop" aria-current={!active ? 'page' : undefined}>
          All
        </Link>
        {Object.entries(lookOccasionLabels).map(([value, label]) => (
          <Link
            key={value}
            href={`/shop?occasion=${value}`}
            aria-current={active === value ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      {visible.length ? (
        <div className="look-grid">
          {visible.map((look) => (
            <article className="look-card" key={look._id}>
              <Link
                className="look-card__image"
                href={`/looks/${encodeURIComponent(look.slug)}`}
                aria-label={`View ${look.title}`}
              >
                <ContentImage image={lookImage(look)} width={720} height={900} />
              </Link>
              <div className="look-card__copy">
                <WishlistButton id={look._id} title={look.title} />
                <p className="eyebrow">{lookOccasionLabel(look.occasion)}</p>
                <h2>
                  <Link href={`/looks/${encodeURIComponent(look.slug)}`}>{look.title}</Link>
                </h2>
                {look.description && <p>{look.description}</p>}
                <Link className="text-link" href={`/looks/${encodeURIComponent(look.slug)}`}>
                  View the Look →
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="looks-empty" role="status">
          <h2>{active ? 'No Looks for this occasion yet' : 'Looks are coming soon'}</h2>
          <p>
            {active
              ? 'Try another occasion or browse all Looks.'
              : 'New outfit stories will appear here as they are published.'}
          </p>
          {active && (
            <Link className="text-link" href="/shop">
              View all Looks
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
