'use client';
import { useState } from 'react';
import { rememberLeadSignup } from '@/lib/lead-modal';
import { emailFormatSchema } from '@/lib/forms';
export function SubmissionForm({
  kind,
  idPrefix = kind,
  ctaLabel,
  className,
  onAccepted,
}: {
  kind: 'request' | 'newsletter';
  idPrefix?: string;
  ctaLabel?: string;
  className?: string;
  onAccepted?: () => void;
}) {
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [emailState, setEmailState] = useState<'neutral' | 'valid' | 'invalid'>('neutral');
  const formClassName = className || (kind === 'newsletter' ? 'newsletter__form' : 'request-form');
  const joined = formClassName.split(/\s+/).includes('newsletter__form');
  return (
    <form
      className={formClassName}
      onReset={() => setEmailState('neutral')}
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setStatus('Sending…');
        const form = e.currentTarget;
        try {
          const response = await fetch('/api/forms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind, ...Object.fromEntries(new FormData(form)) }),
          });
          const result = (await response.json()) as { message: string };
          setStatus(result.message);
          if (response.ok) {
            form.reset();
            if (kind === 'newsletter') rememberLeadSignup();
            if (onAccepted) setAccepted(true);
            onAccepted?.();
          }
        } catch {
          setStatus('Unable to send. Please try again later.');
        } finally {
          setPending(false);
        }
      }}
    >
      {kind === 'request' && (
        <>
          <div className="form-row">
            <label htmlFor="reqProduct">Item name or link (required)</label>
            <input
              id="reqProduct"
              name="product"
              placeholder="Paste a product link or enter its name"
              required
              maxLength={1000}
            />
          </div>
          <div className="form-row">
            <label htmlFor="reqNotes">
              What should I check? <span className="optional">(optional)</span>
            </label>
            <textarea
              id="reqNotes"
              name="notes"
              placeholder="Sizing, fabric, length, support…"
              rows={3}
              maxLength={5000}
            />
          </div>
        </>
      )}
      {kind === 'request' && (
        <div className="form-row request-form__name">
          <label htmlFor="reqName">
            Name <span className="optional">(optional)</span>
          </label>
          <input
            id="reqName"
            name="name"
            placeholder="Your name"
            maxLength={100}
            autoComplete="name"
          />
        </div>
      )}
      <div className={kind === 'request' ? 'form-row request-form__email' : 'newsletter-field'}>
        <label htmlFor={`${idPrefix}Email`}>
          Email address{kind === 'request' && ' (required)'}
        </label>
        <div className="email-control" data-validation={emailState}>
          <input
            id={`${idPrefix}Email`}
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            maxLength={254}
            autoComplete="email"
            aria-invalid={emailState === 'invalid' ? true : undefined}
            aria-describedby={`${idPrefix}EmailFeedback${kind === 'request' ? ` ${idPrefix}EmailHint` : ''}`}
            onInput={(event) => {
              const input = event.currentTarget;
              const valid = emailFormatSchema.safeParse(input.value).success;
              input.setCustomValidity(
                input.value && !valid
                  ? 'Enter a valid email address, such as you@example.com.'
                  : '',
              );
              setEmailState(
                !input.value ? 'neutral' : valid && input.validity.valid ? 'valid' : 'invalid',
              );
            }}
            onBlur={(event) => {
              setEmailState(
                event.currentTarget.validity.valid &&
                  emailFormatSchema.safeParse(event.currentTarget.value).success
                  ? 'valid'
                  : 'invalid',
              );
            }}
            onInvalid={() => setEmailState('invalid')}
          />
          <svg
            className="email-control__tick"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="m5 12 4 4L19 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span id={`${idPrefix}EmailFeedback`} className="visually-hidden" aria-live="polite">
          {emailState === 'valid'
            ? 'Email format looks valid.'
            : emailState === 'invalid'
              ? 'Enter a valid email address, such as you@example.com.'
              : ''}
        </span>
        {kind === 'request' && (
          <p id={`${idPrefix}EmailHint`} className="form-hint">
            So I can follow up about your request.
          </p>
        )}
      </div>
      {kind === 'request' && (
        <p className="request-form__promise">
          I read every request, but can’t promise every item gets reviewed.
        </p>
      )}
      <div hidden aria-hidden="true">
        <label htmlFor={`${idPrefix}Website`}>Leave empty</label>
        <input id={`${idPrefix}Website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button
        type="submit"
        className={`btn btn-accent${joined ? ' joined' : ''}`}
        disabled={pending || accepted}
      >
        {pending
          ? 'Sending…'
          : accepted
            ? 'Subscribed'
            : ctaLabel || (kind === 'newsletter' ? 'Subscribe' : 'Send request')}
      </button>
      <p
        className={kind === 'newsletter' ? 'form-status newsletter-message' : 'form-status'}
        role="status"
        aria-live="polite"
      >
        {status}
      </p>
    </form>
  );
}
