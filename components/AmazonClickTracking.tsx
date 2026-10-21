'use client';
import { useEffect } from 'react';
import { isAmazonUrl } from '@/lib/amazon';
/** Provider-neutral adapter. No network, cookies, storage, query strings or user IDs. */
export function AmazonClickTracking({ enabled = false }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let consent = false;
    const change = (event: Event) => {
      consent = (event as CustomEvent<{ granted?: boolean }>).detail?.granted === true;
    };
    const click = (event: MouseEvent) => {
      if (
        !consent ||
        (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl ||
        navigator.doNotTrack === '1'
      )
        return;
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[data-amazon-product]')
          : null;
      if (!target || !isAmazonUrl(target.href)) return;
      const placement = target.dataset.placement;
      const experience = target.dataset.experience;
      window.dispatchEvent(
        new CustomEvent('cgr:amazon-outbound', {
          detail: {
            productId: target.dataset.amazonProduct,
            sourcePage: location.pathname,
            placement: ['product', 'collection', 'review', 'guide'].includes(placement || '')
              ? placement
              : 'product',
            experience: ['tested', 'mannequin', 'curated'].includes(experience || '')
              ? experience
              : 'curated',
          },
        }),
      );
    };
    window.addEventListener('cgr:analytics-consent', change);
    document.addEventListener('click', click, true);
    document.addEventListener('auxclick', click, true);
    return () => {
      window.removeEventListener('cgr:analytics-consent', change);
      document.removeEventListener('click', click, true);
      document.removeEventListener('auxclick', click, true);
    };
  }, [enabled]);
  return null;
}
