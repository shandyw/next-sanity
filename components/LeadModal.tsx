'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Settings } from '@/lib/types';
import { SubmissionForm } from './SubmissionForm';
import {
  LEAD_DELAY_MS,
  dismissLead,
  halfPageReached,
  leadAutoPromptEligible,
  leadSessionStarted,
  leadSignupSucceeded,
  markLeadShown,
} from '@/lib/lead-modal';

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
  const [showBanner, setShowBanner] = useState(false);
  useEffect(() => {
    if (!content.enabled) return;
    const element = dialog.current;
    const started = leadSessionStarted();
    let eligible = false;
    let lastPointerY = 0;
    let busyUntil = 0;
    let routePending = false;
    let routeTarget = '';
    let routeStartedAt = 0;
    const mobile = window.matchMedia('(max-width: 799px)');
    const interacting = () =>
      document.querySelector('dialog[open]') ||
      document.activeElement?.matches('input, textarea, select, [contenteditable="true"]') ||
      Array.from(document.querySelectorAll('video')).some(
        (video) => !video.paused && !video.ended,
      ) ||
      routePending ||
      Date.now() < busyUntil;
    const open = (automatic: boolean) => {
      if (!element || element.open || document.querySelector('dialog[open]')) return;
      if (automatic) markLeadShown();
      setShowBanner(false);
      previousFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      element.showModal();
    };
    const check = () => {
      if (halfPageReached()) eligible = true;
      if (!leadAutoPromptEligible() || Date.now() - started < LEAD_DELAY_MS) return;
      if (!eligible || interacting()) return;
      if (mobile.matches) {
        markLeadShown();
        setShowBanner(true);
      } else open(true);
    };
    const pointer = (event: PointerEvent) => {
      lastPointerY = event.clientY;
    };
    const exit = (event: MouseEvent) => {
      if (
        !mobile.matches &&
        !event.relatedTarget &&
        event.clientY >= -12 &&
        event.clientY <= 12 &&
        lastPointerY > event.clientY &&
        Date.now() - started >= LEAD_DELAY_MS
      ) {
        eligible = true;
        check();
      }
    };
    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const manual = target?.closest('[data-open-lead]');
      if (manual) {
        event.preventDefault();
        open(false);
        return;
      }
      const anchor = target?.closest<HTMLAnchorElement>('a[href]');
      if (anchor?.matches('[data-amazon-product]')) busyUntil = Date.now() + 3000;
      if (anchor && anchor.origin === location.origin && anchor.pathname !== location.pathname) {
        routePending = true;
        routeTarget = anchor.pathname;
        routeStartedAt = Date.now();
      }
    };
    const navigationDone = () => {
      routePending = false;
      busyUntil = Date.now() + 500;
    };
    const deviceChanged = () => {
      if (!mobile.matches) setShowBanner(false);
      check();
    };
    const interval = window.setInterval(() => {
      if (
        routePending &&
        (location.pathname === routeTarget || Date.now() - routeStartedAt > 10_000)
      ) {
        routePending = false;
        busyUntil = Date.now() + 500;
      }
      check();
    }, 250);
    document.addEventListener('pointermove', pointer, { passive: true });
    document.addEventListener('mouseout', exit);
    document.addEventListener('click', click, true);
    window.addEventListener('popstate', navigationDone);
    window.addEventListener('pageshow', navigationDone);
    window.addEventListener('scroll', check, { passive: true });
    mobile.addEventListener('change', deviceChanged);
    return () => {
      clearInterval(interval);
      document.removeEventListener('pointermove', pointer);
      document.removeEventListener('mouseout', exit);
      document.removeEventListener('click', click, true);
      window.removeEventListener('popstate', navigationDone);
      window.removeEventListener('pageshow', navigationDone);
      window.removeEventListener('scroll', check);
      mobile.removeEventListener('change', deviceChanged);
      element?.close();
    };
  }, [content.enabled]);

  const dismiss = () => dialog.current?.close();
  return (
    <>
      {showBanner && (
        <aside className="lead-banner" aria-label="Newsletter invitation">
          <div className="lead-banner__copy">
            <strong>Real Curves. Real Talk.</strong>
            <p>Honest reviews, fabulous finds, and zero fashion BS.</p>
          </div>
          <button
            type="button"
            className="lead-banner__cta"
            aria-haspopup="dialog"
            aria-controls="leadDialog"
            onClick={(event) => {
              previousFocus.current = event.currentTarget;
              setShowBanner(false);
              dialog.current?.showModal();
            }}
          >
            I&apos;m In!
          </button>
          <button
            type="button"
            className="lead-banner__close"
            aria-label="Dismiss newsletter invitation"
            onClick={() => {
              dismissLead();
              setShowBanner(false);
            }}
          >
            ×
          </button>
        </aside>
      )}
      <dialog
        id="leadDialog"
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
          ).filter(
            (element) => element.getClientRects().length > 0 && !element.closest('[hidden]'),
          );
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
          if (!leadSignupSucceeded() && !submittedThisVisit.current) dismissLead();
          if (previousFocus.current?.isConnected) previousFocus.current.focus();
          else {
            const main = document.querySelector<HTMLElement>('#main');
            if (main) {
              main.tabIndex = -1;
              main.focus({ preventScroll: true });
            }
          }
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
            <button type="button" className="lead-dialog__later" onClick={dismiss}>
              Maybe later
            </button>
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
    </>
  );
}
