import { ExternalLinkIcon } from '@/components/ExternalLinkIcon';
import { getSettings } from '@/lib/content';
import { safeExternal } from '@/lib/urls';
import { pageMetadata } from '@/lib/seo';
import { EditorialHero } from '@/components/EditorialHero';

export const metadata = pageMetadata(
  'Support the Reviews',
  'Help supply future CurvyGirlReviews try-ons through my review gift list.',
  '/support',
);
export default async function Page() {
  const settings = await getSettings();
  const wishlist = safeExternal(settings.reviewWishlistUrl);
  return (
    <main id="main" className="container">
      <EditorialHero title="Support the Reviews" intro="Help choose what I try on next." />
      <div className="support-board">
        <p className="support-board__note">
          <span>You pick. I try.</span>
        </p>
        <div className="support-choices">
          <section
            className="support-choice support-choice--gift"
            aria-labelledby="review-gifts-title"
          >
            <div className="support-choice__content">
              <h2 id="review-gifts-title" className="support-choice__title">
                Send me something to review
              </h2>
              <p className="support-choice__copy">
                Choose something from my Amazon Wishlist and help decide what I try next.
              </p>
              {wishlist ? (
                <a
                  className="btn btn-accent support-choice__button"
                  href={wishlist}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Wishlist
                  <ExternalLinkIcon />
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              ) : (
                <p className="support-choice__unavailable">
                  My review gift list will be available here soon.
                </p>
              )}
            </div>
          </section>
          <section
            className="support-choice support-choice--request"
            aria-labelledby="request-review-title"
          >
            <div className="support-choice__content">
              <h2 id="request-review-title" className="support-choice__title">
                Request a review
              </h2>
              <p className="support-choice__copy">
                Got your eye on something? Send me the link and tell me what you want to know.
              </p>
              <button
                className="btn btn-accent support-choice__button"
                type="button"
                data-open-dialog
                aria-haspopup="dialog"
              >
                Request a Review
              </button>
            </div>
          </section>
        </div>
        <p className="support-board__disclaimer">
          <span>Gifts are optional and don’t guarantee a review or a positive opinion.</span>
        </p>
      </div>
    </main>
  );
}
