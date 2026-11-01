import Link from 'next/link';
import { ContentImage } from '@/components/ContentImage';
import { findImage, lookImage, type Look } from '@/lib/looks';
import { ArrowIcon } from './ArrowIcon';

export function HomeFeaturedLook({ look }: { look: Look }) {
  const href = `/looks/${encodeURIComponent(look.slug)}`;
  const finds = (look.items || []).filter((item) => item.find);

  return (
    <section className="home-looks home-looks--single">
      {' '}
      <div className="container" aria-labelledby="home-looks-heading">
        <div className="home-section-heading">
          <div>
            <h2 id="home-looks-heading">Shop the Looks</h2>
            <p className="home-section-heading__intro">Outfits for wherever life takes you.</p>
          </div>

          <Link className="text-link" href="/shop">
            <span>Browse all Looks</span> <ArrowIcon />
          </Link>
        </div>
        <article className="home-featured-look">
          <Link className="home-featured-look__image" href={href} aria-label={`View ${look.title}`}>
            <ContentImage
              image={lookImage(look)}
              width={960}
              height={800}
              sizes="(max-width: 899px) 100vw, 52vw"
            />
          </Link>
          <div className="home-featured-look__copy">
            <p className="eyebrow home-featured-look__eyebrow">Shop the Look</p>
            <h3 id="home-looks-heading">{look.title}</h3>
            {look.description && <p className="home-featured-look__intro">{look.description}</p>}
            {finds.length > 0 && (
              <div className="home-featured-look__finds">
                <p className="eyebrow">
                  {finds.length} curated {finds.length === 1 ? 'Find' : 'Finds'}
                </p>
                <ul>
                  {finds.slice(0, 3).map((item) => (
                    <li key={item._key}>
                      <ContentImage
                        image={findImage(item.find)}
                        width={260}
                        height={260}
                        sizes="150px"
                      />
                      <span>{item.find!.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link className="btn btn-accent btn-lg" href={href}>
              Shop This Look
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
