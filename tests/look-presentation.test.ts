import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { vercelStegaCombine } from '@vercel/stega';
import {
  eligibleLookItems,
  findCategoryIcon,
  findDisplayTitle,
  groupLookItems,
  relatedLooks,
} from '../lib/look-presentation';
import type { Look, LookFind } from '../lib/looks';

const find: LookFind = { _id: 'find-one', title: 'Linen top' };
const item = (key: string, linked?: LookFind) => ({ _key: key, find: linked });
const look = (items?: Look['items']): Look => ({
  _id: 'look-one',
  title: 'Summer Look',
  slug: 'summer-look',
  items,
});

test('ordered published Finds are reusable across Looks without needing product images', () => {
  const second = { _id: 'find-two', title: 'Wide-leg pants' };
  assert.deepEqual(eligibleLookItems(look([item('a', find), item('b', second)])), [
    item('a', find),
    item('b', second),
  ]);
  assert.deepEqual(eligibleLookItems(look([item('c', find)])), [item('c', find)]);
});

test('missing and draft-only Find references are excluded, including an empty Look', () => {
  assert.deepEqual(eligibleLookItems(look()), []);
  assert.deepEqual(
    eligibleLookItems(
      look([item('missing'), item('draft', { _id: 'drafts.find-one', title: 'Private' })]),
    ),
    [],
  );
});

test('category icons map to existing assets with a generic fallback', () => {
  for (const slug of [
    'shoes',
    'shorts',
    'outerwear',
    'skirts',
    'activewear',
    'jeans',
    'tops',
    'dresses',
    'accessories',
    'pants',
    'intimates',
  ]) {
    assert.equal(existsSync(join(process.cwd(), 'public', findCategoryIcon(slug))), true, slug);
  }
  assert.equal(findCategoryIcon('dresses'), '/img/product-icons/dress.svg');
  assert.equal(findCategoryIcon('shoes'), '/img/product-icons/shoe.svg');
  assert.equal(findCategoryIcon('outerwear'), '/img/product-icons/outerwear.svg');
  assert.equal(findCategoryIcon('unknown'), '/img/product-icons/shirt.svg');
  assert.equal(findCategoryIcon(), '/img/product-icons/shirt.svg');
});

test('legacy and explicit essentials retain order while alternatives form a separate group', () => {
  const shared = { _id: 'shared', title: 'Denim skirt' };
  const mixed = groupLookItems(
    look([
      { ...item('one', find), placementRole: 'alternative' },
      { ...item('two', shared), placementRole: 'essential' },
      { ...item('three', find), role: 'Top' },
      { ...item('four', shared), role: 'Bottom', placementRole: 'alternative' },
    ]),
  );
  assert.deepEqual(
    mixed.essential.map((entry) => entry._key),
    ['two', 'three'],
  );
  assert.deepEqual(
    mixed.alternative.map((entry) => entry._key),
    ['one', 'four'],
  );
  assert.deepEqual(groupLookItems(look([item('legacy', shared)])).alternative, []);
  assert.deepEqual(
    groupLookItems(look([{ ...item('only', shared), placementRole: 'alternative' }])).essential,
    [],
  );
  assert.deepEqual(groupLookItems(look()), { essential: [], alternative: [] });
  assert.equal(groupLookItems(look([item('legacy', shared)])).essential[0].find, shared);
  assert.equal(
    groupLookItems(look([{ ...item('other', shared), placementRole: 'alternative' }]))
      .alternative[0].find,
    shared,
  );
});

test('draft preview editing metadata does not change alternative placement', () => {
  const encoded = vercelStegaCombine('alternative', { origin: 'sanity.io', href: '/studio' });
  assert.notEqual(encoded, 'alternative');
  const grouped = groupLookItems(
    look([{ ...item('alternative', find), placementRole: encoded as 'alternative' }]),
  );
  assert.deepEqual(grouped.essential, []);
  assert.deepEqual(grouped.alternative.map((entry) => entry._key), ['alternative']);
});

test('editorial titles use a nonblank override and otherwise retain the original name', () => {
  assert.equal(findDisplayTitle({ ...find, editorialTitle: '  Linen Tank  ' }), 'Linen Tank');
  assert.equal(findDisplayTitle({ ...find, editorialTitle: '  ' }), find.title);
  assert.equal(findDisplayTitle(find), find.title);
});

test('related Looks prefer the same occasion, omit drafts, duplicates, and the current Look', () => {
  const current = { ...look(), occasion: 'vacation', publishedAt: '2026-11-01T00:00:00Z' };
  const candidates: Look[] = [
    {
      ...look(),
      _id: 'other',
      slug: 'other',
      occasion: 'everyday',
      publishedAt: '2026-11-01T00:00:00Z',
    },
    {
      ...look(),
      _id: 'drafts.same',
      slug: 'same',
      occasion: 'vacation',
      publishedAt: '2026-11-01T00:00:00Z',
    },
    {
      ...look(),
      _id: 'same',
      slug: 'same',
      occasion: 'vacation',
      publishedAt: '2026-11-01T00:00:00Z',
    },
    {
      ...look(),
      _id: 'future',
      slug: 'future',
      occasion: 'vacation',
      publishedAt: '2027-01-01T00:00:00Z',
    },
    {
      ...look(),
      _id: 'third',
      slug: 'third',
      occasion: 'workwear',
      publishedAt: '2026-11-01T00:00:00Z',
    },
    current,
  ];
  assert.deepEqual(
    relatedLooks(current, candidates, new Date('2026-11-07T00:00:00Z')).map((entry) => entry._id),
    ['same', 'other', 'third'],
  );
});
