'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Settings } from '@/lib/types';
import { SubmissionForm } from './SubmissionForm';
import { LEAD_SUBMITTED_KEY, LEAD_DISMISSED_KEY } from '@/lib/lead-modal';

export function LeadModal({
  content,
  image,
}: {
  content: NonNullable<Settings['leadModal']>;
  image: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const submittedThisVisit = useRef(false);
  useEffect(() => {
    if (!content.enabled) return;
    const element = dialog.current;
    let timer: ReturnType<typeof setTimeout>;
    const open = () => {
      if (submittedThisVisit.current) return;
      try {
        if (
          localStorage.getItem(LEAD_SUBMITTED_KEY) === 'true' ||
          sessionStorage.getItem(LEAD_DISMISSED_KEY) === 'true'
        )
          return;
      } catch {
        // Blocked storage still allows dismissal for this mounted visit.
      }
      if (document.querySelector('dialog[open]')) {
        timer = setTimeout(open, 500);
        return;
      }
      previousFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      element?.showModal();
    };
    timer = setTimeout(open, 1200);
    return () => {
      clearTimeout(timer);
      element?.close();
    };
  }, [content.enabled]);

  const dismiss = () => dialog.current?.close();
  return (
    <dialog
      ref={dialog}
      className="dialog native-dialog lead-dialog"
      aria-labelledby="lead-title"
      aria-describedby="lead-copy"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0 && !element.closest('[hidden]'));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClose={() => {
        try {
          sessionStorage.setItem(LEAD_DISMISSED_KEY, 'true');
        } catch {}
        if (previousFocus.current?.isConnected) previousFocus.current.focus();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          dismiss();
      }}
    >
      <button
        className="dialog-close"
        type="button"
        aria-label="Close exclusive offer"
        onClick={dismiss}
      >
        ×
      </button>
      <div className="lead-dialog__columns">
        <section className="lead-dialog__content">
          <p className="lead-dialog__eyebrow">{content.eyebrow || 'Exclusive Offer'}</p>
          <h2 id="lead-title" className="headline-md">
            {content.headline || 'Get 15% Off your first order from my closet!'}
          </h2>
          <p id="lead-copy">{content.copy || "Cute & cheap, you can't go wrong!"}</p>
          <SubmissionForm
            kind="newsletter"
            idPrefix="lead"
            className="request-form lead-form"
            ctaLabel={content.cta || 'Get my 15% off'}
            onAccepted={() => {
              submittedThisVisit.current = true;
            }}
          />
          <p className="body-sm lead-dialog__consent">
            Sign up for email offers and closet updates. You can unsubscribe anytime.{' '}
            <Link href="/privacy" onClick={dismiss}>
              Privacy policy
            </Link>
            .
          </p>
        </section>
        <div className="lead-dialog__image">{image}</div>
      </div>
    </dialog>
  );
}
