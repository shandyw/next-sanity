'use client';

import Link from 'next/link';
import { useState } from 'react';
import { changeWishlist, removeWishlistItems, useWishlist } from './WishlistStore';

export function SavedEditorialItems({
  items,
}: {
  items: { id: string; title: string; href: string; type: 'Review' | 'Look' }[];
}) {
  const { ids, ready, available } = useWishlist();
  const [message, setMessage] = useState('');
  const saved = items.filter((item) => ids.includes(item.id));
  const currentIds = new Set(items.map((item) => item.id));
  const unavailable = ids.filter((id) => !currentIds.has(id));

  return (
    <section aria-labelledby="saved-items-heading" className="saved-editorial">
      <h2 id="saved-items-heading">Your saved Reviews and Looks</h2>
      <p role="status">
        {!ready
          ? 'Loading saved items…'
          : !available
            ? 'Browser storage is unavailable.'
            : message ||
              `${saved.length} available saved ${saved.length === 1 ? 'item' : 'items'}.`}
      </p>
      {saved.length > 0 ? (
        <ul className="saved-editorial__list">
          {saved.map((item) => (
            <li key={item.id}>
              <span className="eyebrow">{item.type}</span>
              <Link href={item.href}>{item.title}</Link>
              <button
                type="button"
                disabled={!available}
                onClick={() => setMessage(changeWishlist(item.id).message)}
                aria-label={`Remove ${item.title} from saved items`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : ready && available ? (
        <p>
          No available Reviews or Looks are saved yet. <Link href="/shop">Browse Looks</Link> or{' '}
          <Link href="/reviews">read Reviews</Link>.
        </p>
      ) : null}
      {ready && available && unavailable.length > 0 && (
        <div className="saved-editorial__unavailable">
          <p>
            {unavailable.length} older saved {unavailable.length === 1 ? 'item is' : 'items are'} no
            longer available.
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
