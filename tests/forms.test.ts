import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../app/api/forms/route';
function submission(data: unknown) {
  return new Request('http://localhost:3000/api/forms', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}
test('only confirmed provider acceptance can report success', async () => {
  const previousEndpoint = process.env.NEWSLETTER_ENDPOINT;
  const originalFetch = globalThis.fetch;
  try {
    delete process.env.NEWSLETTER_ENDPOINT;
    assert.equal(
      (await POST(submission({ kind: 'newsletter', email: 'reader@example.test' }))).status,
      503,
    );
    process.env.NEWSLETTER_ENDPOINT = 'https://provider.example.test/adapter';
    globalThis.fetch = async () => Response.json({ accepted: false });
    assert.equal(
      (await POST(submission({ kind: 'newsletter', email: 'reader@example.test' }))).status,
      502,
    );
    globalThis.fetch = async () => new Response('', { status: 500 });
    assert.equal(
      (await POST(submission({ kind: 'newsletter', email: 'reader@example.test' }))).status,
      502,
    );
    globalThis.fetch = async () => {
      throw new Error('offline');
    };
    assert.equal(
      (await POST(submission({ kind: 'newsletter', email: 'reader@example.test' }))).status,
      502,
    );
    globalThis.fetch = async () => Response.json({ accepted: true });
    assert.equal(
      (await POST(submission({ kind: 'newsletter', email: 'reader@example.test' }))).status,
      200,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousEndpoint === undefined) delete process.env.NEWSLETTER_ENDPOINT;
    else process.env.NEWSLETTER_ENDPOINT = previousEndpoint;
  }
});
test('malformed origins, spam and invalid request fields fail before delivery', async () => {
  const bad = new Request('http://localhost:3000/api/forms', {
    method: 'POST',
    headers: { origin: 'invalid', host: 'localhost:3000' },
    body: '{}',
  });
  assert.equal((await POST(bad)).status, 403);
  assert.equal(
    (await POST(submission({ kind: 'newsletter', email: 'reader@example.test', website: 'spam' })))
      .status,
    400,
  );
  assert.equal(
    (await POST(submission({ kind: 'request', email: 'reader@example.test', product: ' ' })))
      .status,
    400,
  );
});
test('MailerLite uses the configured group and confirms real provider acceptance', async () => {
  const previousToken = process.env.MAILERLITE_API_TOKEN;
  const previousGroup = process.env.MAILERLITE_GROUP_ID;
  const originalFetch = globalThis.fetch;
  const email = 'reader@example.test';
  let calls = 0;
  const provider = (status: string) =>
    Response.json({ data: { id: '123', email, status } }, { status: 201 });
  try {
    process.env.MAILERLITE_API_TOKEN = 'test-secret';
    delete process.env.MAILERLITE_GROUP_ID;
    globalThis.fetch = async () => {
      calls++;
      return provider('unconfirmed');
    };
    assert.equal((await POST(submission({ kind: 'newsletter', email }))).status, 503);
    process.env.MAILERLITE_GROUP_ID = 'not-a-group-id';
    assert.equal((await POST(submission({ kind: 'newsletter', email }))).status, 503);
    assert.equal(calls, 0);
    process.env.MAILERLITE_GROUP_ID = '456';
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url, 'https://connect.mailerlite.com/api/subscribers');
      assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer test-secret');
      assert.equal(options?.redirect, 'error');
      assert.equal(options?.cache, 'no-store');
      assert.deepEqual(JSON.parse(String(options?.body)), { email, groups: ['456'] });
      return provider('unconfirmed');
    };
    let response = await POST(submission({ kind: 'newsletter', email }));
    assert.equal(response.status, 200);
    assert.match((await response.json()).message, /confirm/);
    assert.equal(calls, 1);
    globalThis.fetch = async () => provider('active');
    response = await POST(submission({ kind: 'newsletter', email }));
    assert.equal(response.status, 200);
    assert.doesNotMatch((await response.json()).message, /confirm/);
    for (const status of ['unsubscribed', 'bounced', 'junk']) {
      globalThis.fetch = async () => provider(status);
      assert.equal((await POST(submission({ kind: 'newsletter', email }))).status, 409);
    }
    for (const data of [
      { accepted: true },
      { data: { id: '123', email: 'wrong@example.test', status: 'active' } },
      { data: { id: '', email, status: 'active' } },
    ]) {
      globalThis.fetch = async () => Response.json(data);
      assert.equal((await POST(submission({ kind: 'newsletter', email }))).status, 502);
    }
    for (const status of [401, 422, 429, 500]) {
      globalThis.fetch = async () => new Response('', { status });
      assert.equal((await POST(submission({ kind: 'newsletter', email }))).status, 502);
    }
    globalThis.fetch = async () => {
      throw new Error('timeout');
    };
    assert.equal((await POST(submission({ kind: 'newsletter', email }))).status, 502);
    calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return provider('active');
    };
    assert.equal(
      (await POST(submission({ kind: 'newsletter', email, website: 'spam' }))).status,
      400,
    );
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousToken === undefined) delete process.env.MAILERLITE_API_TOKEN;
    else process.env.MAILERLITE_API_TOKEN = previousToken;
    if (previousGroup === undefined) delete process.env.MAILERLITE_GROUP_ID;
    else process.env.MAILERLITE_GROUP_ID = previousGroup;
  }
});
