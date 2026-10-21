import { getDocuments, getSettings } from '@/lib/content';
import { giftListUrl } from '@/lib/urls';
import { reviewWishlistItems } from '@/lib/catalog';
import { ProductGrid } from '@/components/ProductGrid';
import { ExternalLinkIcon } from '@/components/ExternalLinkIcon';
import { pageMetadata } from '@/lib/seo';
import { EditorialHero } from '@/components/EditorialHero';

export const metadata = pageMetadata(
  'Support the Reviews',
  'Help supply future CurvyGirlReviews try-ons through my review gift list.',
  '/support',
);
export default async function Page() {
  const [settings, products] = await Promise.all([getSettings(), getDocuments('product')]);
  const wishlist = giftListUrl(settings.reviewWishlistUrl);
  const wishes = reviewWishlistItems(products);
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
                Choose an item from My Review Wishlist. Use Amazon’s gift-list options to send it to
                me; an ordinary product link does not arrange delivery.
              </p>
              {wishlist ? (
                <a
                  className="btn btn-accent support-choice__button"
                  href={wishlist}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View My Amazon Wishlist
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
                Suggest something
              </h2>
              <p className="support-choice__copy">
                Suggest an item without purchasing it. Send me the link and tell me what you want to
                know.
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
      <section id="review-wishlist" aria-labelledby="review-wishlist-title">
        <h2 id="review-wishlist-title">My Review Wishlist</h2>
        <p>
          These are Curated Finds I would like to review. Saving an item does not purchase or
          reserve it. Gifts never guarantee a review or a positive opinion.
        </p>
        {wishes.length ? (
          <ProductGrid items={wishes} settings={settings} />
        ) : (
          <p>
            No catalog wishlist items to show yet.{' '}
            {wishlist
              ? 'Use the Amazon wishlist above for current gift choices.'
              : 'My Amazon wishlist link will be available here once configured.'}
          </p>
        )}
        <p>
          <a href="/my-wishlist">Browse all review-wishlist items</a>
        </p>
      </section>
    </main>
  );
}
