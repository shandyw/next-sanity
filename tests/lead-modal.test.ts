import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  LEAD_COOLDOWN_MS,
  LEAD_DELAY_MS,
  LEAD_DISMISSED_KEY,
  LEAD_SESSION_SHOWN_KEY,
  LEAD_SESSION_STARTED_KEY,
  LEAD_SUBMITTED_KEY,
  dismissLead,
  halfPageReached,
  leadAutoPromptEligible,
  leadSessionStarted,
  leadSignupSucceeded,
  markLeadShown,
  rememberLeadSignup,
} from '../lib/lead-modal';

type StorageStub = Pick<Storage, 'getItem' | 'setItem'>;
const local = new Map<string, string>();
const session = new Map<string, string>();
function storage(values: Map<string, string>): StorageStub {
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
function browser() {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: storage(local),
      sessionStorage: storage(session),
      innerHeight: 800,
      scrollY: 0,
    },
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      documentElement: { scrollHeight: 2400 },
    },
  });
}
afterEach(() => {
  local.clear();
  session.clear();
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { document?: unknown }).document;
});

test('session timer starts once and survives a component remount', () => {
  browser();
  assert.equal(leadSessionStarted(1000), 1000);
  assert.equal(session.get(LEAD_SESSION_STARTED_KEY), '1000');
  assert.equal(leadSessionStarted(1000 + LEAD_DELAY_MS), 1000);
  assert.equal(halfPageReached(), false);
  (window as Window & { scrollY: number }).scrollY = 800;
  assert.equal(halfPageReached(), true);
  (window as Window & { scrollY: number }).scrollY = 0;
  (document.documentElement as unknown as { scrollHeight: number }).scrollHeight = 800;
  assert.equal(halfPageReached(), false);
});

test('once per session, fourteen-day dismissal, and successful signup suppression', () => {
  browser();
  assert.equal(leadAutoPromptEligible(1000), true);
  markLeadShown();
  assert.equal(session.get(LEAD_SESSION_SHOWN_KEY), 'true');
  assert.equal(leadAutoPromptEligible(1000), false);
  session.clear();
  dismissLead(1000);
  assert.equal(local.get(LEAD_DISMISSED_KEY), '1000');
  assert.equal(leadAutoPromptEligible(1000 + LEAD_COOLDOWN_MS - 1), false);
  assert.equal(leadAutoPromptEligible(1000 + LEAD_COOLDOWN_MS), true);
  rememberLeadSignup();
  assert.equal(local.get(LEAD_SUBMITTED_KEY), 'true');
  assert.equal(leadSignupSucceeded(), true);
  assert.equal(leadAutoPromptEligible(1000 + LEAD_COOLDOWN_MS), false);
});

test('failed signup leaves no subscriber flag', () => {
  browser();
  assert.equal(leadSignupSucceeded(), false);
  assert.equal(local.has(LEAD_SUBMITTED_KEY), false);
});

test('blocked storage falls back to in-memory suppression without PII', () => {
  browser();
  const now = Date.now();
  leadSessionStarted(now);
  leadAutoPromptEligible(10);
  session.clear();
  leadSessionStarted(now);
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get: () => {
      throw Error('blocked');
    },
  });
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    get: () => {
      throw Error('blocked');
    },
  });
  assert.equal(leadSessionStarted(now), now);
  assert.equal(leadSessionStarted(now + 1), now);
  dismissLead(now);
  assert.equal(leadAutoPromptEligible(now + 1), false);
  rememberLeadSignup();
  assert.equal(leadSignupSucceeded(), true);
});

test('readable storage with rejected writes still uses memory fallback', () => {
  browser();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: () => {
        throw Error('quota');
      },
    },
  });
  dismissLead(1000);
  assert.equal(leadAutoPromptEligible(1001), false);
  rememberLeadSignup();
  assert.equal(leadSignupSucceeded(), true);
});
