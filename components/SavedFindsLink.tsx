'use client';

import Link from 'next/link';
import { useWishlist } from './WishlistStore';
import { WishlistHeart } from './WishlistHeart';

export function SavedFindsLink() {
  const { ids, ready, available } = useWishlist();
  const count = ready && available ? ids.length : 0;
  const savedText = 'Saved Items:';
  const icon = (
    <>
      <WishlistHeart size={36} />
      {count > 0 && (
        <span className="saved-finds__count" aria-hidden="true">
          {count}
        </span>
      )}
    </>
  );
  return (
    <span className="saved-finds-group">
      <span className="saved-finds__text">{savedText}</span>
      <Link
        className="saved-finds"
        href="/wishlist"
        aria-label={
          available
            ? `${savedText} ${count} saved ${count === 1 ? 'item' : 'items'}`
            : 'View saved items: browser storage is blocked'
        }
        title="View your saved items"
      >
        {icon}
      </Link>
    </span>
  );
}
