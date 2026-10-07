import { getSettings } from '@/lib/content';
import { safeExternal } from '@/lib/urls';
import { pageMetadata } from '@/lib/seo';
import { InnerHero } from '@/components/InnerHero';
import Image from 'next/image';

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
      <InnerHero title="Support the Reviews" intro="Help choose what I try next." />
      <div className="review-detail__top">
        <section aria-labelledby="review-gifts-title">
          <h2 id="review-gifts-title" className="headline-md">
            Send me something to review
          </h2>
          <p>
            Want to send me something to try? Choose an item from my review wishlist. Gifts are
            optional, and receiving an item doesn’t guarantee a review or a positive opinion.
          </p>
          {wishlist ? (
            <a className="btn btn-accent" href={wishlist} target="_blank" rel="noopener noreferrer">
              Shop My Review Wishlist<span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          ) : (
            <p>My review gift list will be available here soon.</p>
          )}
          <p>
            Check the exact size, color, and recipient at checkout. Purchases and delivery are
            handled by the wishlist provider.
          </p>
          <p>
            For an item outside my list, send its link first. Please wait until I confirm the item,
            size, and color before purchasing.
          </p>
          <button className="btn btn-ghost" data-open-dialog>
            Request a Review
          </button>
          <p className="body-sm">
            This gift list supplies future try-ons. Your visitor wishlist saves items you may want
            to shop for yourself.
          </p>
        </section>
        <figure className="polaroid polaroid--dialog" aria-hidden="true">
          <Image
            src="/img/mirror.jpg"
            alt=""
            width={4514}
            height={3009}
            sizes="(max-width: 799px) 80vw, 320px"
          />
        </figure>
      </div>
    </main>
  );
}
