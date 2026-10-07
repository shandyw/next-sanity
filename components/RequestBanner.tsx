import type { PageContent } from '@/lib/types';
import { ContentImage } from './ContentImage';
export function RequestBanner({ content }: { content: PageContent }) {
  return (
    <section className="request-cta" aria-labelledby="requestCtaHeading">
      <div className="container">
        <div className="request-banner">
          <span className="tape-corner tape-corner--bl" aria-hidden="true" />
          <div className="request-banner__copy-wrap">
            <h2 className="request-banner__title" id="requestCtaHeading">
              {content.requestTitle || 'Your Wishlist. My Fitting Room.'}
            </h2>
            <p className="request-banner__copy">
              {content.requestIntro || 'Eyeing something? Send it my way.'}
            </p>
            <div className="request-banner__actions">
              <button className="btn btn-accent" data-open-dialog>
                Request a Review
              </button>
            </div>
          </div>
          <div className="request-banner__art">
            <ContentImage
              className="request-banner__photo"
              image={content.requestImage}
              demoSrc="https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&h=700&fit=crop&q=85&fm=jpg"
              width={900}
              height={700}
            />
          </div>
          <span className="tape-corner tape-corner--br" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
