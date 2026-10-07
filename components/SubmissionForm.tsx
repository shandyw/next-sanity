'use client';
import { useState } from 'react';
export function SubmissionForm({ kind }: { kind: 'request' | 'newsletter' }) {
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  return (
    <form
      className={kind === 'newsletter' ? 'newsletter__form' : 'request-form'}
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
          if (response.ok) form.reset();
        } catch {
          setStatus('Unable to send. Please try again later.');
        } finally {
          setPending(false);
        }
      }}
    >
      {kind === 'request' && (
        <div className="form-row">
          <label htmlFor="reqName">
            Name <span className="optional">(optional)</span>
          </label>
          <input id="reqName" name="name" maxLength={100} autoComplete="name" />
        </div>
      )}
      <div className={kind === 'request' ? 'form-row' : 'newsletter-field'}>
        <label
          htmlFor={`${kind}Email`}
          className={kind === 'newsletter' ? 'visually-hidden' : undefined}
        >
          Your email address
        </label>
        <input
          id={`${kind}Email`}
          name="email"
          type="email"
          placeholder="Your email address"
          required
          maxLength={254}
          autoComplete="email"
        />
      </div>
      {kind === 'request' && (
        <>
          <div className="form-row">
            <label htmlFor="reqProduct">Item name or link (required)</label>
            <input id="reqProduct" name="product" required maxLength={1000} />
          </div>
          <div className="form-row">
            <label htmlFor="reqNotes">
              Comments <span className="optional">(optional)</span>
            </label>
            <textarea id="reqNotes" name="notes" rows={3} maxLength={5000} />
          </div>
        </>
      )}
      <div hidden aria-hidden="true">
        <label htmlFor={`${kind}Website`}>Leave empty</label>
        <input id={`${kind}Website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" className="btn btn-accent" disabled={pending}>
        {pending ? 'Sending…' : kind === 'newsletter' ? 'Subscribe' : 'Send request'}
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
