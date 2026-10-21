import Image from 'next/image';
import { stegaClean } from 'next-sanity';
import type { Settings } from '@/lib/types';
import { closetShopUrl } from '@/lib/urls';
import { ExternalLinkIcon } from './ExternalLinkIcon';

export function ClosetBanner({ settings, shopUrl }: { settings: Settings; shopUrl?: string }) {
  const vinted = closetShopUrl(stegaClean(settings.vintedShopUrl || shopUrl));

  return (
    <section className="closet-banner" aria-labelledby="closet-banner-title">
      <div className="closet-banner__copy">
        <p className="closet-banner__eyebrow">Shop my closet</p>
        <h2 id="closet-banner-title">
          Great finds.
          <br />
          Second chances.
        </h2>
        <p>Shop clothes, shoes &amp; accessories from my personal closet.</p>
        {vinted && (
          <div className="closet-banner__actions">
            <a className="btn btn-ghost" href={vinted} target="_blank" rel="noopener noreferrer">
              My Vinted Closet <ExternalLinkIcon />
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
