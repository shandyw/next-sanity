'use client';

import { useId, useState } from 'react';
import { changeWishlist, useWishlist } from './WishlistStore';
import { WishlistHeart } from './WishlistHeart';

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
        aria-label={`${saved ? 'Remove from saved items' : 'Save item'}: ${title}`}
        aria-describedby={statusId}
        title={saved ? 'Remove from saved items' : 'Save item'}
        onClick={() => {
          const result = changeWishlist(id);
          setMessage(result.message);
          setError(!result.ok);
        }}
      >
        <WishlistHeart />
      </button>
      <p
        id={statusId}
        role="status"
        className={error || !available ? 'wishlist-heart-error body-sm' : 'visually-hidden'}
      >
        {available ? message : 'Saved Items unavailable: allow browser storage for this site.'}
      </p>
    </div>
  );
}
