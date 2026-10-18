import type { PageContent } from '@/lib/types';
import Image from 'next/image';
import { useId } from 'react';
export function RequestBanner({
  content = {},
}: { content?: Pick<PageContent, 'requestTitle' | 'requestIntro'> } = {}) {
  const headingId = `request-cta-${useId()}`;
  return (
    <section className="request-cta" aria-labelledby={headingId}>
      <div className="container">
        <div className="request-banner">
          <div className="request-banner__copy-wrap">
            <h2 className="request-banner__title" id={headingId}>
              {content.requestTitle || 'Your Wishlist. My Fitting Room.'}
            </h2>
            <p className="request-banner__copy">
              {content.requestIntro || 'Eyeing something? Send it my way.'}
            </p>
            <div className="request-banner__actions">
              <button
                className="btn btn-accent"
                type="button"
                data-open-dialog
                aria-haspopup="dialog"
              >
                Request a Review
              </button>
            </div>
          </div>
          <div className="request-banner__art">
            <Image
              className="request-banner__photo"
              src="/img/closet.jpg"
              alt="Clothes hanging on a closet rail beside shelves and handbags"
              sizes="(max-width: 767px) 90vw, 45vw"
              width={900}
              height={601}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
