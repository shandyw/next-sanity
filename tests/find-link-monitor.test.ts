import test from 'node:test';
import assert from 'node:assert/strict';
import { vercelStegaCombine } from '@vercel/stega';
import {
  checkFindLink,
  dueLinkUpdate,
  isFindUnavailable,
  referencedPublishedFindIds,
  runFindLinkMonitor,
  type MonitoredFind,
  type MonitorStore,
} from '../lib/find-link-monitor';
import { GET } from '../app/api/cron/find-links/route';
import { isAuthorizedCron } from '../lib/cron-auth';
import type { Settings } from '../lib/types';
import { findAmazonLink } from '../lib/find-amazon-link';

const active: Settings = { amazonAssociates: { active: true, tag: 'site-20' } };
const base: MonitoredFind = {
  _id: 'find-one',
  _rev: 'rev-one',
  asin: 'B0C5R6Q2XZ',
  amazonUrl: 'https://www.amazon.com/dp/B0C5R6Q2XZ/',
  affiliateUrl: 'https://www.amazon.com/gp/product/B0C5R6Q2XZ?tag=site-20',
};

test('valid URLs pass structural checks without claiming stock availability', () => {
  const check = checkFindLink(base, active);
  assert.equal(check.status, 'healthy');
  assert.match(check.result, /stock not checked/);
  assert.equal(checkFindLink({ ...base, asin: undefined }, active).status, 'healthy');
  assert.match(checkFindLink({ ...base, affiliateUrl: undefined }, {}).result, /^Product URL/);
});

test('invalid, missing and mismatched URLs need editorial review', () => {
  assert.deepEqual(
    checkFindLink({ ...base, amazonUrl: undefined, affiliateUrl: undefined }, active),
    { status: 'needsReview', result: 'Missing Amazon product and affiliate URLs' },
  );
  assert.equal(
    checkFindLink({ ...base, amazonUrl: 'http://amazon.com/dp/B0C5R6Q2XZ' }, active).status,
    'needsReview',
  );
  assert.equal(
    checkFindLink({ ...base, amazonUrl: 'https://amazon.com.evil.test/dp/B0C5R6Q2XZ' }, active)
      .status,
    'needsReview',
  );
  assert.equal(
    checkFindLink(
      { ...base, affiliateUrl: base.affiliateUrl?.replace('tag=site-20', 'tag=other-20') },
      active,
    ).status,
    'needsReview',
  );
  assert.equal(checkFindLink({ ...base, affiliateUrl: undefined }, active).status, 'needsReview');
  assert.equal(
    checkFindLink({ ...base, asin: 'B0C5R6Q2XY' }, active).result,
    'Product identifier mismatch',
  );
  assert.equal(checkFindLink({ ...base, asin: 'BAD' }, active).result, 'Invalid ASIN');
  assert.equal(
    checkFindLink(
      { ...base, affiliateUrl: 'https://www.amazon.com/dp/B0C5R6Q2XY?tag=site-20' },
      active,
    ).result,
    'Product identifier mismatch',
  );
});

test('short-link checks stay non-final without following redirects', () => {
  assert.equal(
    checkFindLink(
      {
        ...base,
        amazonUrl: undefined,
        affiliateUrl: 'https://amzn.to/abc',
        affiliateShortLinkVerified: true,
      },
      active,
    ).status,
    'unchecked',
  );
  assert.equal(
    checkFindLink(
      { ...base, affiliateUrl: 'https://amzn.to/abc', affiliateShortLinkVerified: true },
      active,
    ).status,
    'unchecked',
  );
  assert.equal(
    checkFindLink(
      {
        ...base,
        amazonUrl: undefined,
        affiliateUrl: 'https://amzn.to/abc',
        asin: undefined,
        affiliateShortLinkVerified: true,
      },
      active,
    ).status,
    'needsReview',
  );
  assert.equal(
    checkFindLink(
      {
        ...base,
        amazonUrl: undefined,
        affiliateUrl: 'https://amzn.to/abc',
        affiliateShortLinkVerified: false,
      },
      active,
    ).status,
    'needsReview',
  );
});

test('only unique published Find references are selected', () => {
  assert.deepEqual(
    referencedPublishedFindIds([
      {
        _id: 'look-one',
        items: [{ find: { _ref: 'find-one' } }, { find: { _ref: 'drafts.find-two' } }],
      },
      {
        _id: 'look-two',
        items: [{ find: { _ref: 'find-one' } }, { find: { _ref: 'find-three' } }],
      },
    ]),
    ['find-one', 'find-three'],
  );
});

test('manual Unavailable survives automated checks and alone suppresses public CTAs', () => {
  const now = new Date('2026-11-08T00:00:00Z');
  assert.equal(
    dueLinkUpdate({ ...base, linkStatus: 'unavailable' }, checkFindLink(base, active), now),
    false,
  );
  for (const status of ['unchecked', 'healthy', 'needsReview'])
    assert.equal(isFindUnavailable(status), false);
  assert.equal(isFindUnavailable('unavailable'), true);
  assert.equal(
    isFindUnavailable(vercelStegaCombine('unavailable', { origin: 'sanity.io', href: '/studio' })),
    true,
  );
  for (const linkStatus of ['unchecked', 'healthy', 'needsReview'] as const)
    assert.equal(findAmazonLink({ ...base, title: 'Top', linkStatus }, active)?.affiliate, true);
  assert.equal(
    findAmazonLink({ ...base, title: 'Top', linkStatus: 'unavailable' }, active),
    undefined,
  );
});

test('unchanged weekly checks are idempotent and partial failures are counted', async () => {
  const now = new Date('2026-11-08T00:00:00Z');
  const writes: string[] = [];
  const finds = [{ ...base }, { ...base, _id: 'find-two', _rev: 'rev-two' }];
  const store: MonitorStore = {
    loadLooks: async () => [
      {
        _id: 'look',
        items: [
          { find: { _ref: 'find-one' } },
          { find: { _ref: 'find-one' } },
          { find: { _ref: 'find-two' } },
          { find: { _ref: 'drafts.only-draft' } },
        ],
      },
    ],
    loadFinds: async () => finds,
    loadSettings: async () => active,
    patchFind: async (find, check, checkedAt) => {
      writes.push(find._id);
      if (find._id === 'find-two') throw Error('Sanity write failed');
      Object.assign(find, {
        linkStatus: check.status,
        linkCheckResult: check.result,
        linkLastCheckedAt: checkedAt,
      });
    },
  };
  assert.deepEqual(await runFindLinkMonitor(store, now), {
    referenced: 2,
    checked: 2,
    updated: 1,
    skipped: 0,
    failed: 1,
  });
  assert.deepEqual(await runFindLinkMonitor(store, now), {
    referenced: 2,
    checked: 2,
    updated: 0,
    skipped: 1,
    failed: 1,
  });
  assert.deepEqual(writes, ['find-one', 'find-two', 'find-two']);
  assert.deepEqual(await runFindLinkMonitor({ ...store, loadLooks: async () => [] }, now), {
    referenced: 0,
    checked: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  });
  assert.deepEqual(await runFindLinkMonitor({ ...store, loadFinds: async () => [] }, now), {
    referenced: 2,
    checked: 0,
    updated: 0,
    skipped: 0,
    failed: 2,
  });
  assert.deepEqual(
    await runFindLinkMonitor(
      {
        ...store,
        loadFinds: async () => [{ ...base, linkStatus: 'unavailable' }],
      },
      now,
    ),
    { referenced: 2, checked: 1, updated: 0, skipped: 1, failed: 1 },
  );
  assert.deepEqual(
    await runFindLinkMonitor(
      {
        ...store,
        loadFinds: async () => [{ ...base }],
        patchFind: async () => {
          throw { statusCode: 409 };
        },
      },
      now,
    ),
    { referenced: 2, checked: 1, updated: 0, skipped: 1, failed: 1 },
  );
});

test('cron authorization rejects anonymous and incorrect requests before Sanity access', async () => {
  const previous = process.env.CRON_SECRET;
  try {
    process.env.CRON_SECRET = 'a'.repeat(40);
    assert.equal(isAuthorizedCron(null, process.env.CRON_SECRET), false);
    assert.equal(isAuthorizedCron('Bearer wrong', process.env.CRON_SECRET), false);
    assert.equal(
      isAuthorizedCron(`Bearer ${process.env.CRON_SECRET}`, process.env.CRON_SECRET),
      true,
    );
    const response = await GET(new Request('https://example.test/api/cron/find-links'));
    assert.equal(response.status, 401);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
