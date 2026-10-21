'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowIcon } from './ArrowIcon';
import { changeWishlist, removeWishlistItems, useWishlist } from './WishlistStore';

export function WishlistItems({
  items,
}: {
  items: {
    id: string;
    name: string;
    image: React.ReactNode;
    title: React.ReactNode;
    shop: React.ReactNode;
    status: string;
    action: React.ReactNode;
  }[];
}) {
  const { ids, ready, available } = useWishlist();
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const saved = items.filter((item) => ids.includes(item.id));
  const missing = ids.length - saved.length;
  const focusHeading = () => requestAnimationFrame(() => heading.current?.focus());
  if (ready && available && saved.length === 0) {
    return (
      <section className="wishlist-empty" aria-labelledby="wishlist-heading">
        <Image
          className="wishlist-empty__image"
          src="/img/empty.jpg"
          alt=""
          width={1536}
          height={1024}
          sizes="(max-width: 767px) 90vw, 42vw"
        />
        <div className="wishlist-empty__copy">
          <p className="wishlist-empty__eyebrow">Nothing saved… yet.</p>
          <h2 id="wishlist-heading" className="wishlist-empty__title" tabIndex={-1} ref={heading}>
            Your next favorite is out there.
          </h2>
          <p className="wishlist-empty__intro">
            Tap the heart on any piece you love to save it here.
          </p>
          <div className="wishlist-empty__actions">
            <Link className="btn btn-accent btn-lg wishlist-empty__button" href="/shop/closet">
              Browse My Closet <ArrowIcon />
            </Link>
            {missing > 0 && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  const result = removeWishlistItems(ids);
                  setMessage(result.message);
                  if (result.ok) focusHeading();
                }}
              >
                Clear unavailable items
              </button>
            )}
          </div>
          {missing > 0 && (
            <p className="wishlist-empty__missing">
              {missing} previously saved {missing === 1 ? 'piece is' : 'pieces are'} currently
              unavailable. Your saved IDs are retained if those items return.
            </p>
          )}
          <p
            role="status"
            className={message ? 'wishlist-empty__feedback body-sm' : 'visually-hidden'}
          >
            {message || '0 saved items.'}
          </p>
        </div>
      </section>
    );
  }
  return (
    <section className="mt-3.5" aria-labelledby="wishlist-heading">
      <h2 id="wishlist-heading" className="headline-md mt-3" tabIndex={-1} ref={heading}>
        Saved items
      </h2>
      <p role="status">
        {!ready
          ? 'Loading your saved items…'
          : !available
            ? 'Your browser blocks site storage. Enable it to save items.'
            : `${saved.length} saved ${saved.length === 1 ? 'item' : 'items'}.`}{' '}
        {message}
      </p>
      {ready && available && saved.length > 0 && (
        <button
          className="btn btn-ghost mb-6"
          type="button"
          onClick={() => {
            const result = changeWishlist();
            setMessage(result.message);
            if (result.ok) focusHeading();
          }}
        >
          Clear saved items
        </button>
      )}
      {ready && missing > 0 && (
        <p className="body-sm">
          {missing} saved {missing === 1 ? 'item is' : 'items are'} no longer in the current
          catalog. Your saved IDs are retained if those items return.
        </p>
      )}
      {saved.length > 0 && (
        <div
          className="wishlist-table-wrap"
          role="region"
          aria-label="Saved items table, scroll horizontally on smaller screens"
          tabIndex={0}
        >
          <table className="wishlist-table">
            <caption className="visually-hidden">
              Your saved items, shops, availability and shopping links
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="visually-hidden">Remove</span>
                </th>
                <th scope="col">Item name</th>
                <th scope="col">Shop</th>
                <th scope="col">Availability</th>
                <th scope="col">
                  <span className="visually-hidden">Shopping actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {saved.map((item) => (
                <tr key={item.id} className="wishlist-row">
                  <td>
                    <button
                      type="button"
                      className="wishlist-remove"
                      aria-label={`Remove from saved items: ${item.name}`}
                      disabled={!available}
                      onClick={() => {
                        const result = changeWishlist(item.id);
                        setMessage(result.message);
                        if (result.ok) focusHeading();
                      }}
                    >
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
                      </svg>
                    </button>
                  </td>
                  <th scope="row">
                    <div className="wishlist-item">
                      <div className="wishlist-item__image">{item.image}</div>
                      <div className="wishlist-item__name">{item.title}</div>
                    </div>
                  </th>
                  <td className="wishlist-item__shop">{item.shop}</td>
                  <td>{item.status}</td>
                  <td className="wishlist-item__actions">{item.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <noscript>
        <p>
          Enable JavaScript to view the items saved in your browser.{' '}
          <a href="/shop">Browse items</a>.
        </p>
      </noscript>
    </section>
  );
}
