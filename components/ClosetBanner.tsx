import Image from 'next/image';
import { stegaClean } from 'next-sanity';
import type { Settings } from '@/lib/types';
import { closetShopUrl } from '@/lib/urls';
import { ExternalLinkIcon } from './ExternalLinkIcon';

export function ClosetBanner({
  settings,
  shopUrl,
  headingLevel = 'h2',
}: {
  settings: Settings;
  shopUrl?: string;
  headingLevel?: 'h1' | 'h2';
}) {
  const vinted = closetShopUrl(stegaClean(settings.vintedShopUrl || shopUrl));
  const Heading = headingLevel;

  return (
    <section className="closet-banner" aria-labelledby="closet-banner-title">
      <div className="closet-banner__copy">
        <p className="closet-banner__eyebrow">Shop my closet</p>
        <Heading id="closet-banner-title">Shop My Closet</Heading>
        <p>I sell clothing, shoes, and accessories from my personal closet on Vinted.</p>
        {vinted && (
          <div className="closet-banner__actions">
            <a className="btn btn-ghost" href={vinted} target="_blank" rel="noopener noreferrer">
              Shop My Vinted Closet <ExternalLinkIcon />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </div>
        )}
      </div>
      <Image
        className="closet-banner__art"
        src="/img/group2.png"
        alt=""
        width={1536}
        height={1024}
        sizes="(max-width: 767px) 90vw, 45vw"
      />
    </section>
  );
}
