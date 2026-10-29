import Link from 'next/link';
import { notFound } from 'next/navigation';
import { stegaClean } from 'next-sanity';
import { ContentImage } from '@/components/ContentImage';
import { WishlistButton } from '@/components/WishlistButton';
import { AMAZON_DISCLOSURE } from '@/lib/amazon';
import { getSettings } from '@/lib/content';
import {
  findAmazonLink,
  findImage,
  getLook,
  getLooks,
  lookImage,
  lookOccasionLabel,
} from '@/lib/looks';
import { pageMetadata, socialImageUrl } from '@/lib/seo';

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
  const items = look.items?.filter((item) => item.find) || [];
  const image = lookImage(look);
  const related = all
    .filter((other) => other._id !== look._id && other.occasion === look.occasion)
    .slice(0, 3);

  return (
    <main id="main" className="container look-detail">
      <nav aria-label="Breadcrumb" className="look-breadcrumb">
        <Link href="/shop">Shop the Looks</Link> / <span aria-current="page">{look.title}</span>
      </nav>
      <header className="look-detail__header">
        <p className="eyebrow">{lookOccasionLabel(look.occasion)}</p>
        <h1>{look.title}</h1>
        <WishlistButton id={look._id} title={look.title} />
        {look.description && <p>{look.description}</p>}
      </header>
      <figure className="look-detail__hero">
        <ContentImage
          image={image}
          width={1200}
          height={900}
          sizes="(max-width: 767px) 100vw, 90vw"
          priority
          preserveFullImage
        />
        {image && items.some((item) => item.hotspot && item.find) && (
          <div className="look-hotspots" aria-label="Items in this Look">
            {items.map((item, index) => {
              const x = item.hotspot?.x;
              const y = item.hotspot?.y;
              if (
                !item.find ||
                x === undefined ||
                y === undefined ||
                x < 0 ||
                x > 100 ||
                y < 0 ||
                y > 100
              )
                return null;
              return (
                <a
                  className="look-hotspot"
                  key={item._key}
                  href={`#look-item-${index + 1}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  aria-label={`Jump to ${stegaClean(item.find.title)}`}
                >
                  {index + 1}
                </a>
              );
            })}
          </div>
        )}
      </figure>
      <section className="look-detail__products" aria-labelledby="look-items-heading">
        <h2 id="look-items-heading">Shop this Look</h2>
        {items.length ? (
          <>
            <p className="affiliate-note">{AMAZON_DISCLOSURE} Links open Amazon in a new tab.</p>
            <div className="look-item-grid">
              {items.map((item, index) => {
                const find = item.find!;
                const link = findAmazonLink(find, settings);
                return (
                  <article className="look-item" id={`look-item-${index + 1}`} key={item._key}>
                    <ContentImage image={findImage(find)} width={520} height={650} />
                    <div className="look-item__copy">
                      {item.role && <p className="eyebrow">{item.role}</p>}
                      <h3>{find.title}</h3>
                      {item.stylingNote && <p>{item.stylingNote}</p>}
                      {find.experienceStatus === 'tested' && <p>Personally tested</p>}
                      {find.experienceStatus === 'received' && <p>Received, not yet tested</p>}
                      {link && (
                        <a
                          className="btn btn-accent"
                          href={link.href}
                          target="_blank"
                          rel={
                            link.affiliate ? 'sponsored noopener noreferrer' : 'noopener noreferrer'
                          }
                        >
                          View on Amazon{' '}
                          <span className="visually-hidden">(opens in a new tab)</span>
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <p>There are no shoppable Finds in this Look yet.</p>
        )}
      </section>
      {related.length > 0 && (
        <section className="look-related" aria-labelledby="related-looks-heading">
          <h2 id="related-looks-heading">More Looks</h2>
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
                  <h3>
                    <Link href={`/looks/${encodeURIComponent(other.slug)}`}>{other.title}</Link>
                  </h3>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
