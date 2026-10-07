import { NextResponse } from 'next/server';
import { submissionSchema } from '@/lib/forms';
import { z } from 'zod';
export const runtime = 'nodejs';
const subscriberResponse = z.object({
  data: z.object({
    id: z.string().min(1),
    email: z.email(),
    status: z.enum(['active', 'unconfirmed', 'unsubscribed', 'bounced', 'junk']),
  }),
});
async function subscribeWithMailerLite(email: string) {
  const token = process.env.MAILERLITE_API_TOKEN?.trim();
  const group = process.env.MAILERLITE_GROUP_ID?.trim();
  if (!token || !group || !/^\d+$/.test(group))
    return NextResponse.json(
      {
        message:
          'Newsletter signup is not available yet. Nothing was submitted. Please try again later.',
      },
      { status: 503 },
    );
  try {
    const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      redirect: 'error',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      // Let MailerLite's API double opt-in setting control confirmation. Never
      // override subscription status or reactivate an unsubscribed/bounced reader.
      body: JSON.stringify({ email, groups: [group] }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Provider rejected signup');
    const result = subscriberResponse.safeParse(await response.json());
    if (!result.success || result.data.data.email.toLowerCase() !== email.toLowerCase())
      throw new Error('Provider did not confirm signup');
    if (!['active', 'unconfirmed'].includes(result.data.data.status))
      return NextResponse.json(
        { message: 'This address could not be subscribed. Please contact us for help.' },
        { status: 409 },
      );
    return NextResponse.json({
      message:
        result.data.data.status === 'unconfirmed'
          ? 'Check your inbox to confirm your newsletter subscription.'
          : 'You are subscribed to the newsletter. Thank you!',
    });
  } catch {
    return NextResponse.json(
      { message: 'The newsletter service could not accept your signup. Please try again later.' },
      { status: 502 },
    );
  }
}
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  let sameOrigin = false;
  try {
    sameOrigin = !!origin && new URL(origin).host === request.headers.get('host');
  } catch {}
  if (!sameOrigin)
    return NextResponse.json({ message: 'Submission origin is not allowed.' }, { status: 403 });
  if (Number(request.headers.get('content-length') || 0) > 16000)
    return NextResponse.json({ message: 'Submission is too large.' }, { status: 413 });
  let payload: unknown;
  try {
    const text = await request.text();
    if (text.length > 16000)
      return NextResponse.json({ message: 'Submission is too large.' }, { status: 413 });
    payload = JSON.parse(text);
  } catch {
    return NextResponse.json({ message: 'Invalid submission.' }, { status: 400 });
  }
  const parsed = submissionSchema.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json({ message: 'Check your email and required fields.' }, { status: 400 });
  // Direct MailerLite integration takes precedence over the optional adapter.
  if (
    parsed.data.kind === 'newsletter' &&
    (process.env.MAILERLITE_API_TOKEN || process.env.MAILERLITE_GROUP_ID)
  )
    return subscribeWithMailerLite(parsed.data.email);
  const endpoint =
    parsed.data.kind === 'request'
      ? process.env.REVIEW_REQUEST_ENDPOINT
      : process.env.NEWSLETTER_ENDPOINT;
  const token =
    parsed.data.kind === 'request'
      ? process.env.REVIEW_REQUEST_TOKEN
      : process.env.NEWSLETTER_TOKEN;
  if (!endpoint)
    return NextResponse.json(
      {
        message:
          'Submissions are not available yet. Nothing was submitted. Please try again later.',
      },
      { status: 503 },
    );
  try {
    const u = new URL(endpoint);
    if (u.protocol !== 'https:' || u.username || u.password)
      throw new Error('Invalid provider endpoint');
    const response = await fetch(u, {
      method: 'POST',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Provider did not accept submission');
    const acknowledgment = (await response.json()) as { accepted?: boolean };
    if (acknowledgment.accepted !== true) throw new Error('Provider did not confirm acceptance');
    return NextResponse.json({
      message:
        parsed.data.kind === 'request'
          ? 'Your request was accepted. Thank you!'
          : 'Your subscription was accepted. Check your inbox for confirmation.',
    });
  } catch {
    return NextResponse.json(
      { message: 'The service could not accept your submission. Please try again later.' },
      { status: 502 },
    );
  }
}
