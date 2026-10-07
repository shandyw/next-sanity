'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Settings } from '@/lib/types';
import { SubmissionForm } from './SubmissionForm';
import { safeExternal } from '@/lib/urls';
export function Dialogs({ settings }: { settings: Settings }) {
  const wishlistUrl = safeExternal(settings.reviewWishlistUrl);
  const request = useRef<HTMLDialogElement>(null);
  const contact = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const open = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>(
        '[data-open-dialog],[data-open-contact]',
      );
      if (!target) return;
      e.preventDefault();
      trigger.current = target;
      (target.hasAttribute('data-open-contact') ? contact : request).current?.showModal();
    };
    document.addEventListener('click', open);
    return () => document.removeEventListener('click', open);
  }, []);
  const restore = () => trigger.current?.focus();
  const trap = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== 'Tab') return;
    const controls = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]',
      ),
    ).filter((n) => !n.closest('[hidden]') && n.getClientRects().length > 0);
    const first = controls[0],
      last = controls[controls.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };

  return (
    <>
      <dialog
        className={`dialog native-dialog request-dialog${wishlistUrl ? ' request-dialog--with-gifting' : ''}`}
        ref={request}
        aria-labelledby="dialogTitle"
        onClose={restore}
        onKeyDown={trap}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <button
          className="dialog-close"
          type="button"
          aria-label="Close request dialog"
          onClick={() => request.current?.close()}
        >
          ×
        </button>
        <h2 id="dialogTitle" className="headline-md">
          Request a review
        </h2>
        <p className="body-md dialog-intro">
          Tell me what you&apos;d like reviewed. I read every request, though I can&apos;t promise
          every item gets reviewed.
        </p>
        <div className="request-dialog__columns">
          <section aria-labelledby="suggest-review-title">
            <h3 id="suggest-review-title" className="headline-sm">
              Suggest an item
            </h3>
            <p className="body-sm">
              Have something in mind? Send its link below. If you want to buy it for me, please wait
              until I confirm the item, size, and color and add it to my review wishlist.
            </p>
            <SubmissionForm kind="request" />
          </section>
          {wishlistUrl && (
            <section className="review-gifting" aria-labelledby="send-review-title">
              <h3 id="send-review-title" className="headline-sm">
                Send me something to review
              </h3>
              <p className="body-sm">
                Want to send me something to try? Choose an item from my review wishlist. Gifts are
                optional, and receiving an item doesn’t guarantee a review or a positive opinion.
              </p>
              <Link
                className="btn btn-accent"
                href="/support"
                onClick={() => request.current?.close()}
              >
                Support the Reviews
              </Link>
            </section>
          )}
        </div>
      </dialog>
      <dialog
        className="dialog native-dialog"
        ref={contact}
        aria-labelledby="contactTitle"
        onClose={restore}
        onKeyDown={trap}
      >
        <button
          className="dialog-close"
          aria-label="Close contact dialog"
          onClick={() => contact.current?.close()}
        >
          ×
        </button>
        <h2 className="headline-md" id="contactTitle">
          Let’s talk
        </h2>
        {settings.contactEmail ? (
          <p>
            <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
          </p>
        ) : (
          <p>Contact details will be available here soon.</p>
        )}
        {settings.contactDetails && <p>{settings.contactDetails}</p>}
      </dialog>
    </>
  );
}
