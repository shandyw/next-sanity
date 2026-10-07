'use client';

import { useSyncExternalStore } from 'react';
import { parseWishlist, wishlistKey, wishlistLimit } from '@/lib/wishlist';

const serverSnapshot = { ids: [] as string[], ready: false, available: true };
const unavailableSnapshot = { ids: [] as string[], ready: true, available: false };
let cachedRaw: string | null | undefined;
let cachedSnapshot = serverSnapshot;
const eventName = 'curvygirlreviews:wishlist-change';

function getSnapshot() {
  try {
    const raw = window.localStorage.getItem(wishlistKey);
    if (raw !== cachedRaw || !cachedSnapshot.ready) {
      cachedRaw = raw;
      cachedSnapshot = { ids: parseWishlist(raw), ready: true, available: true };
    }
    return cachedSnapshot;
  } catch {
    return unavailableSnapshot;
  }
}
function subscribe(callback: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === wishlistKey || event.key === null) callback();
  };
  window.addEventListener('storage', storage);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener('storage', storage);
    window.removeEventListener(eventName, callback);
  };
}
export function useWishlist() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}
export function changeWishlist(id?: string): { ok: boolean; message: string } {
  try {
    const ids = parseWishlist(window.localStorage.getItem(wishlistKey));
    const saved = id ? ids.includes(id) : false;
    if (id && !saved && ids.length >= wishlistLimit)
      return {
        ok: false,
        message: `Your wishlist is full (${wishlistLimit} items). Remove an item first.`,
      };
    if (id)
      window.localStorage.setItem(
        wishlistKey,
        JSON.stringify({
          version: 1,
          ids: saved ? ids.filter((value) => value !== id) : [...ids, id],
        }),
      );
    else window.localStorage.removeItem(wishlistKey);
    window.dispatchEvent(new Event(eventName));
    return {
      ok: true,
      message: id
        ? saved
          ? 'Removed from your wishlist.'
          : 'Saved to your wishlist.'
        : 'Wishlist cleared.',
    };
  } catch {
    return {
      ok: false,
      message: 'Your browser could not save this change. Enable site storage and try again.',
    };
  }
}
