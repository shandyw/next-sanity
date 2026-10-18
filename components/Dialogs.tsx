'use client';
import { useEffect, useRef } from 'react';
import type { Settings } from '@/lib/types';
import { SubmissionForm } from './SubmissionForm';
import { safeExternal } from '@/lib/urls';
import { ExternalLinkIcon } from './ExternalLinkIcon';
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
        className="dialog native-dialog request-dialog"
        ref={request}
        aria-labelledby="dialogTitle"
        onClose={restore}
        onKeyDown={trap}
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          const bounds = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < bounds.left ||
            e.clientX > bounds.right ||
            e.clientY < bounds.top ||
            e.clientY > bounds.bottom
          )
            e.currentTarget.close();
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
          Eyeing something? Send me the link and tell me what you want to know about the fit.
        </p>
        <SubmissionForm kind="request" />
        {wishlistUrl && (
          <section className="review-gifting" aria-labelledby="send-review-title">
            <h3 id="send-review-title" className="headline-sm">
              Want to send something my way?
            </h3>
            <p>Choose from my review wishlist so the item, size, and color are right.</p>
            <a
              className="review-gifting__link"
              href={wishlistUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Browse the review wishlist <ExternalLinkIcon />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
            <p className="review-gifting__disclaimer">
              Suggesting something else? Wait for my confirmation before buying. Gifts are optional
              and don’t guarantee a review or a positive opinion.
            </p>
          </section>
        )}
      </dialog>
      <dialog
        className="dialog native-dialog"
        ref={contact}
        aria-labelledby="contactTitle"
        onClose={restore}
        onKeyDown={trap}
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          const bounds = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < bounds.left ||
            e.clientX > bounds.right ||
            e.clientY < bounds.top ||
            e.clientY > bounds.bottom
          )
            e.currentTarget.close();
        }}
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
