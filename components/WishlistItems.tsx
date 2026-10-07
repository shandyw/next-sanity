'use client';

import { useRef, useState } from 'react';
import { changeWishlist, useWishlist } from './WishlistStore';

export function WishlistItems({ cards }: { cards: { id: string; content: React.ReactNode }[] }) {
  const { ids, ready, available } = useWishlist();
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const saved = cards.filter((card) => ids.includes(card.id));
  const missing = ids.length - saved.length;
  return (
    <section
      className="mt-3.5"
      aria-labelledby="wishlist-heading"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('.wishlist-action button'))
          heading.current?.focus();
      }}
    >
      <h2 id="wishlist-heading" className="headline-md mt-3" tabIndex={-1} ref={heading}>
        Saved items
      </h2>
      <p role="status">
        {!ready
          ? 'Loading your saved items…'
          : !available
            ? 'Your browser blocks site storage. Enable it to use a wishlist.'
            : `${saved.length} saved ${saved.length === 1 ? 'item' : 'items'}.`}{' '}
        {message}
      </p>
      {ready && available && ids.length > 0 && (
        <button
          className="btn btn-ghost mb-6"
          type="button"
          onClick={() => {
            setMessage(changeWishlist().message);
            heading.current?.focus();
          }}
        >
          Clear wishlist
        </button>
      )}
      {ready && available && saved.length === 0 && (
        <p>
          Your wishlist has no items to display. <a href="/shop">Browse the closet</a> and save
          something you like.
        </p>
      )}
      {ready && missing > 0 && (
        <p className="body-sm">
          {missing} saved {missing === 1 ? 'item is' : 'items are'} no longer in the current
          catalog. Your saved IDs are retained if those items return.
        </p>
      )}
      <ul className="review-grid reviews-grid">
        {saved.map((card) => (
          <li key={card.id} className="review-card">
            {card.content}
          </li>
        ))}
      </ul>
      <noscript>
        <p>
          Enable JavaScript to view the wishlist saved in your browser.{' '}
          <a href="/shop">Browse items</a>.
        </p>
      </noscript>
    </section>
  );
}
