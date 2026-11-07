import Link from 'next/link';
import { notFound } from 'next/navigation';
import { stegaClean } from 'next-sanity';
import { ContentImage } from '@/components/ContentImage';
import { WishlistButton } from '@/components/WishlistButton';
import { AMAZON_DISCLOSURE } from '@/lib/amazon';
import { findAsin } from '@/lib/finds';
import { getSettings } from '@/lib/content';
import {
  findAmazonLink,
  getLook,
  getLooks,
  lookImage,
  lookImageSource,
  lookOccasionLabel,
} from '@/lib/looks';
import {
  findCategoryIcon,
  findDisplayTitle,
  groupLookItems,
  relatedLooks,
} from '@/lib/look-presentation';
import { pageMetadata, socialImageUrl } from '@/lib/seo';
import { ArrowIcon } from '@/components/ArrowIcon';
import type { LookItem, LookFind } from '@/lib/looks';
import type { Settings } from '@/lib/types';

function LookFindRow({
  item,
  index,
  settings,
  compact = false,
}: {
  item: LookItem & { find: LookFind };
  index: number;
  settings: Settings;
  compact?: boolean;
}) {
  const find = item.find;
  const link = findAmazonLink(find, settings);
  const fullTitle = stegaClean(findDisplayTitle(find));
  const characters = Array.from(fullTitle);
  const displayTitle =
    characters.length > 140 ? `${characters.slice(0, 139).join('')}…` : fullTitle;

  return (
    <article
      className={`look-item${compact ? ' look-item--alternative' : ''}`}
      id={`look-item-${index}`}
    >
      <img
        className="look-item__icon"
        src={findCategoryIcon(find.category?.slug)}
        alt=""
        width="56"
        height="56"
      />
      <div className="look-item__copy">
        <p className="eyebrow">{find.category?.title || 'Curated Find'}</p>
        <h3 aria-label={characters.length > 140 ? fullTitle : undefined}>{displayTitle}</h3>
        {(item.stylingNote?.trim() || find.description?.trim()) && (
          <p>{item.stylingNote?.trim() || find.description?.trim()}</p>
        )}
      </div>
      {link && (
        <div className="look-item__cta">
          <a
            className="text-link"
            href={link.href}
            target="_blank"
            aria-label={`View ${fullTitle} on Amazon (opens in a new tab)`}
            data-amazon-product={findAsin(find) || find._id}
            data-placement="collection"
            data-experience="curated"
            rel={link.affiliate ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}
          >
            View on Amazon <ArrowIcon />
          </a>
        </div>
      )}
    </article>
  );
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const look = await getLook(slug);
  if (!look) return { title: 'Look not found', robots: { index: false } };
  const metadata = pageMetadata(
    look.seo?.title || look.title,
    look.seo?.description || look.description || look.title,
    `/looks/${slug}`,
  );
  const image = socialImageUrl(look.seo?.socialImage || lookImage(look));
  return image
    ? {
        ...metadata,
        openGraph: { ...metadata.openGraph, images: [{ url: image, alt: look.title }] },
      }
    : metadata;
}

export default async function LookPage({ params }: Props) {
  const { slug } = await params;
  const [look, settings, all] = await Promise.all([getLook(slug), getSettings(), getLooks()]);
  if (!look) notFound();
  const { essential, alternative } = groupLookItems(look);
  const image = lookImage(look);
  const related = relatedLooks(look, all);

  return (
    <main id="main" className={`container look-detail${image ? '' : ' look-detail--text-first'}`}>
      <nav aria-label="Breadcrumb" className="look-breadcrumb">
        <Link href="/shop">Shop the Looks</Link> / <span aria-current="page">{look.title}</span>
      </nav>
      <div className="flex flex-col">
        <header className="look-detail__header order-2 md:flex order-1 items-center justify-between">
          <div className="">
            <p className="eyebrow">{lookOccasionLabel(look.occasion)}</p>

            <h1>{look.title}</h1>

            {look.description && <p className="look__intro">{look.description}</p>}
          </div>
          <WishlistButton id={look._id} title={look.title} showLabel />
        </header>
        {image && (
          <figure className="look-detail__hero order-1 md:order-2">
            <ContentImage
              image={image}
              width={1200}
              height={900}
              sizes="(max-width: 767px) 100vw, 90vw"
              priority
              preserveFullImage
            />
            <figcaption className="look-detail__caption">
              {lookImageSource(look) === 'aiGenerated' ? (
                <>
                  AI styling concept. This image illustrates the outfit’s mood; linked products may
                  differ.
                </>
              ) : (
                <>Editorial mood image; linked products may differ from what is pictured.</>
              )}
            </figcaption>
          </figure>
        )}
      </div>
      <div className="look-detail__shopping">
        {essential.length || alternative.length ? (
          <p className="affiliate-note">{AMAZON_DISCLOSURE} Links open Amazon in a new tab.</p>
        ) : (
          <p className="look-detail__empty">
            This Look is taking shape. Check back for the finishing pieces.
          </p>
        )}
        {essential.length > 0 && (
          <section className="look-detail__products" aria-labelledby="build-look-heading">
            <h2 id="build-look-heading">Build the Look</h2>
            <p>The essential pieces behind this outfit.</p>
            <div className="look-item-list">
              {essential.map((item, index) => (
                <LookFindRow key={item._key} item={item} index={index + 1} settings={settings} />
              ))}
            </div>
          </section>
        )}
        {alternative.length > 0 && (
          <section
            className="look-detail__products look-detail__products--alternatives"
            aria-labelledby="alternatives-heading"
          >
            <h2 id="alternatives-heading">Make It Your Own</h2>
            <p>Switch up the vibe with these alternatives and finishing touches.</p>
            <div className="look-item-list look-item-list--alternatives">
              {alternative.map((item, index) => (
                <LookFindRow
                  key={item._key}
                  item={item}
                  index={essential.length + index + 1}
                  settings={settings}
                  compact
                />
              ))}
            </div>
          </section>
        )}
      </div>
      {related.length > 0 && (
        <section className="look-related" aria-labelledby="related-looks-heading">
          <h2 id="related-looks-heading">More Looks to Love</h2>
          <div className="look-grid">
            {related.map((other) => (
              <article className="look-card" key={other._id}>
                <Link
                  className="look-card__image"
                  href={`/looks/${encodeURIComponent(other.slug)}`}
                  aria-label={`View ${other.title}`}
                >
                  <ContentImage image={lookImage(other)} width={720} height={900} />
                </Link>
                <div className="look-card__copy">
                  <p className="eyebrow">{lookOccasionLabel(other.occasion)}</p>
                  <h3>
                    <Link href={`/looks/${encodeURIComponent(other.slug)}`}>{other.title}</Link>
                  </h3>
                  <Link
                    className="text-link text-link--editorial"
                    href={`/looks/${encodeURIComponent(other.slug)}`}
                  >
                    Explore the Look <ArrowIcon />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
