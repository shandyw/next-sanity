'use client';

import { useId, useState } from 'react';
import { changeWishlist, useWishlist } from './WishlistStore';

export function WishlistButton({ id, title }: { id: string; title: string }) {
  const { ids, ready, available } = useWishlist();
  const saved = ids.includes(id);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const statusId = useId();
  return (
    <div className="wishlist-action">
      <button
        type="button"
        className="wishlist-heart"
        disabled={!ready || !available}
        aria-pressed={saved}
        aria-label={`${saved ? 'Remove' : 'Save'} ${title} ${saved ? 'from' : 'to'} wishlist`}
        aria-describedby={statusId}
        title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
        onClick={() => {
          const result = changeWishlist(id);
          setMessage(result.message);
          setError(!result.ok);
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
        </svg>
      </button>
      <p
        id={statusId}
        role="status"
        className={error || !available ? 'wishlist-heart-error body-sm' : 'visually-hidden'}
      >
        {available ? message : 'Wishlist unavailable: allow browser storage for this site.'}
      </p>
    </div>
  );
}
