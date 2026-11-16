'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { ArrowIcon } from './ArrowIcon';
import { ExternalLinkIcon } from './ExternalLinkIcon';
import { changeWishlist, removeWishlistItems, useWishlist } from './WishlistStore';
import { availableWishlistIds } from '@/lib/wishlist';
import { AMAZON_DISCLOSURE } from '@/lib/amazon';

type SavedFind = {
  id: string;
  title: string;
  description?: string;
  icon: string;
  unavailable: boolean;
  amazonHref?: string;
  affiliate: boolean;
  trackingId: string;
};
type SavedLook = {
  id: string;
  title: string;
  href: string;
  occasion?: string;
  image: React.ReactNode;
};

export function SavedEditorialItems({ finds, looks }: { finds: SavedFind[]; looks: SavedLook[] }) {
  const { ids, ready, available } = useWishlist();
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const publicIds = [...finds.map((find) => find.id), ...looks.map((look) => look.id)];
  const savedIds = availableWishlistIds(ids, publicIds);
  const savedIdSet = new Set(savedIds);
  const savedFinds = finds.filter((find) => savedIdSet.has(find.id));
  const savedLooks = looks.filter((look) => savedIdSet.has(look.id));
  const unavailable = ids.filter((id) => !publicIds.includes(id));

  return (
    <section aria-labelledby="saved-items-heading" className="saved-editorial">
      <h2 id="saved-items-heading" ref={heading} tabIndex={-1}>
        Your saved Finds and Looks
      </h2>
      <p role="status">
        {!ready
          ? 'Loading saved items…'
          : !available
            ? 'Browser storage is unavailable.'
            : message ||
              `${savedIds.length} available saved ${savedIds.length === 1 ? 'item' : 'items'}.`}
      </p>
      {savedFinds.length > 0 && (
        <section aria-labelledby="saved-finds-heading" className="saved-editorial__section">
          <h3 id="saved-finds-heading">My Finds</h3>
          {savedFinds.some((find) => find.affiliate) && (
            <p className="affiliate-note">{AMAZON_DISCLOSURE}</p>
          )}
          <ul className="saved-editorial__list saved-editorial__list--finds">
            {savedFinds.map((find) => (
              <li key={find.id}>
                <img src={find.icon} alt="" width="56" height="56" />
                <div className="saved-editorial__copy">
                  <h4>{find.title}</h4>
                  {find.amazonHref && !find.unavailable && (
                    <a
                      className="text-link"
                      href={find.amazonHref}
                      target="_blank"
                      rel={find.affiliate ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}
                      aria-label={`View ${find.title} on Amazon (opens in a new tab)`}
                      data-amazon-product={find.trackingId}
                      data-placement="collection"
                      data-experience="curated"
                    >
                      View on Amazon <ExternalLinkIcon />
                    </a>
                  )}
                  {find.description && <p>{find.description}</p>}
                  {find.unavailable && (
                    <p className="saved-editorial__unavailable-note">Currently unavailable</p>
                  )}
                </div>
                <button
                  type="button"
                  className="saved-editorial__remove"
                  disabled={!available}
                  onClick={() => setMessage(changeWishlist(find.id).message)}
                  aria-label={`Remove ${find.title} from saved items`}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {savedLooks.length > 0 && (
        <section aria-labelledby="saved-looks-heading" className="saved-editorial__section">
          <h3 id="saved-looks-heading">My Looks</h3>
          <ul className="saved-editorial__list saved-editorial__list--looks">
            {savedLooks.map((look) => (
              <li key={look.id}>
                <Link
                  className="saved-editorial__look-image"
                  href={look.href}
                  aria-label={`View ${look.title}`}
                >
                  {look.image}
                </Link>
                <div className="saved-editorial__copy">
                  {look.occasion && <p className="eyebrow">{look.occasion}</p>}
                  <h4>
                    <Link href={look.href}>{look.title}</Link>
                  </h4>
                  <Link
                    className="text-link"
                    href={look.href}
                    aria-label={`View ${look.title} Look`}
                  >
                    View <ArrowIcon />
                  </Link>
                </div>
                <button
                  type="button"
                  className="saved-editorial__remove"
                  disabled={!available}
                  onClick={() => setMessage(changeWishlist(look.id).message)}
                  aria-label={`Remove ${look.title} from saved items`}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {ready && available && savedIds.length === 0 && (
        <p>
          No available Finds or Looks are saved yet. <Link href="/shop">Browse Looks</Link>.
        </p>
      )}
      {ready && available && ids.length > 0 && (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setMessage(changeWishlist().message);
            heading.current?.focus();
          }}
        >
          Clear saved items
        </button>
      )}
      {ready && available && unavailable.length > 0 && (
        <div className="saved-editorial__unavailable">
          <p>
            {unavailable.length} older or unpublished saved{' '}
            {unavailable.length === 1 ? 'item is' : 'items are'} not currently available.
          </p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setMessage(removeWishlistItems(unavailable).message)}
          >
            Clear unavailable items
          </button>
        </div>
      )}
    </section>
  );
}
