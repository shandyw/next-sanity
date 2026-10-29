import test from 'node:test';
import assert from 'node:assert/strict';
import { asinFromAmazonUrl, asinToAutofill, findAsin, isAmazonProductLink } from '../lib/finds';
import { FindAsinInput } from '../sanity/finds/FindAsinInput';
import { FindDocumentInput } from '../sanity/finds/FindDocumentInput';
import { assertNoFindReferences, deleteFind } from '../sanity/finds/delete';
import { schemaTypes } from '../sanity/schema';

type Field = {
  name: string;
  type?: string;
  initialValue?: unknown;
  to?: { type: string }[];
  of?: { type: string; fields?: Field[] }[];
  fields?: Field[];
  options?: { list?: { value: string }[] };
  components?: { input?: unknown };
  validation?: (rule: {
    required: () => unknown;
    min: (value: number) => unknown;
    custom: (fn: (...args: never[]) => unknown) => unknown;
  }) => unknown;
};

function document(name: string) {
  const type = schemaTypes.find((item) => item.name === name);
  assert.ok(type && 'fields' in type, `${name} is registered`);
  return type as typeof type & { fields: Field[]; validation?: Field['validation'] };
}

function field(fields: Field[], name: string) {
  const result = fields.find((item) => item.name === name);
  assert.ok(result, name);
  return result;
}

function customValidation(target: { validation?: Field['validation'] }) {
  assert.ok(target.validation);
  let validate: (...args: unknown[]) => unknown = () => false;
  const rule = {
    required() {
      return rule;
    },
    min() {
      return rule;
    },
    custom(fn: (...args: never[]) => unknown) {
      validate = fn as typeof validate;
      return rule;
    },
  };
  target.validation(rule);
  return validate;
}

test('Find identity derives ASINs only from supported full Amazon product links', () => {
  assert.equal(
    asinFromAmazonUrl('https://www.amazon.com/dp/B0ABC12345?tag=example-20'),
    'B0ABC12345',
  );
  assert.equal(asinFromAmazonUrl('https://amazon.com/gp/product/B0ABC12345/'), 'B0ABC12345');
  assert.equal(asinFromAmazonUrl('https://amazon.com/gp/aw/d/B0ABC12345'), 'B0ABC12345');
  assert.equal(asinFromAmazonUrl('https://www.amazon.com/dp/B0GQGBJQL7/'), 'B0GQGBJQL7');
  assert.equal(asinFromAmazonUrl('https://www.amazon.com/dp/b0abc12345/?th=1'), 'B0ABC12345');
  assert.equal(asinFromAmazonUrl('https://amazon.com.evil.test/dp/B0ABC12345'), undefined);
  assert.equal(asinFromAmazonUrl('http://amazon.com/dp/B0ABC12345'), undefined);
  assert.equal(asinFromAmazonUrl('https://amazon.com/dp/INVALID'), undefined);
  assert.equal(asinFromAmazonUrl('https://amazon.com/gp/product/B0ABC12345more'), undefined);
  assert.equal(asinFromAmazonUrl('https://amzn.to/example'), undefined);
  assert.equal(asinFromAmazonUrl('not a URL'), undefined);
  assert.equal(isAmazonProductLink('https://amazon.com/dp/B0ABC12345'), true);
  assert.equal(findAsin({ amazonUrl: 'https://amazon.com/dp/B0ABC12345' }), 'B0ABC12345');
});

test('Find ASIN input fills only a blank value from a supported full URL', () => {
  const find = document('find');
  assert.equal('components' in find && find.components?.input, FindDocumentInput);
  assert.equal(field(find.fields, 'asin').components?.input, FindAsinInput);
  assert.equal(asinToAutofill('https://amazon.com/gp/product/B0ABC12345'), 'B0ABC12345');
  assert.equal(asinToAutofill('https://amazon.com/dp/B0ABC12345', 'B0DEF67890'), undefined);
  assert.equal(asinToAutofill('https://amzn.to/example'), undefined);
  assert.equal(asinToAutofill('https://amazon.com/dp/INVALID'), undefined);
});

test('Find deletion checks links to both published and draft versions', async () => {
  let ids: string[] = [];
  const client = {
    fetch: async (_query: string, params: { ids: string[] }) => {
      ids = params.ids;
      return [{ _id: 'look', title: 'Weekend Outfit' }];
    },
  } as unknown as Parameters<typeof assertNoFindReferences>[0];
  await assert.rejects(
    () => assertNoFindReferences(client, 'drafts.find-one'),
    /Remove links to this Find from: Weekend Outfit/,
  );
  assert.deepEqual(ids, ['find-one', 'drafts.find-one']);
  const unlinked = {
    fetch: async () => [],
  } as unknown as Parameters<typeof assertNoFindReferences>[0];
  await assert.doesNotReject(() => assertNoFindReferences(unlinked, 'find-one'));
});

test('Find deletion waits for the action that removes published and draft copies', async () => {
  const actions: unknown[] = [];
  const client = {
    fetch: async () => [],
    transaction: () => {
      throw Error('No Look should be patched');
    },
    action: async (input: unknown) => {
      actions.push(input);
    },
  } as unknown as Parameters<typeof deleteFind>[0];
  await deleteFind(client, 'drafts.find-one');
  assert.deepEqual(actions, [
    {
      actionType: 'sanity.action.document.delete',
      publishedId: 'find-one',
      includeDrafts: ['drafts.find-one'],
    },
  ]);
  const linked = {
    fetch: async () => [{ _id: 'review', _type: 'review', title: 'Weekend Review' }],
    action: async () => {
      throw Error('Deletion must not run for a linked Find');
    },
  } as unknown as Parameters<typeof deleteFind>[0];
  await assert.rejects(() => deleteFind(linked, 'find-one'), /Remove links/);
  assert.equal(actions.length, 1);
});

test('Find deletion unlinks matching items in draft and published Looks before deleting', async () => {
  const events: string[] = [];
  const patches: { id: string; revision: string; items: unknown }[] = [];
  const look = (id: string, ref: string) => ({
    _id: id,
    _type: 'look',
    _rev: `${id}-rev`,
    items: [
      { _key: 'keep', find: { _ref: 'another-find' }, role: 'Top' },
      { _key: 'remove', find: { _ref: ref }, role: 'Shoes', hotspot: { x: 40, y: 50 } },
    ],
  });
  const client = {
    fetch: async () => [
      look('weekend-look', 'find-one'),
      look('drafts.weekend-look', 'drafts.find-one'),
      {
        _id: 'only-item-look',
        _type: 'look',
        _rev: 'only-item-rev',
        items: [{ _key: 'only', find: { _ref: 'find-one' } }],
      },
    ],
    transaction: () => {
      const transaction = {
        patch(
          id: string,
          builder: (patch: {
            ifRevisionId: (rev: string) => { set: (fields: { items: unknown }) => void };
          }) => void,
        ) {
          builder({
            ifRevisionId: (revision) => ({
              set: ({ items }) => {
                patches.push({ id, revision, items });
              },
            }),
          });
          return transaction;
        },
        async commit() {
          events.push('unlink');
        },
      };
      return transaction;
    },
    action: async () => {
      events.push('delete');
    },
  } as unknown as Parameters<typeof deleteFind>[0];
  await deleteFind(client, 'drafts.find-one');
  assert.deepEqual(events, ['unlink', 'delete']);
  assert.deepEqual(patches, [
    {
      id: 'weekend-look',
      revision: 'weekend-look-rev',
      items: [{ _key: 'keep', find: { _ref: 'another-find' }, role: 'Top' }],
    },
    {
      id: 'drafts.weekend-look',
      revision: 'drafts.weekend-look-rev',
      items: [{ _key: 'keep', find: { _ref: 'another-find' }, role: 'Top' }],
    },
    { id: 'only-item-look', revision: 'only-item-rev', items: [] },
  ]);
});

test('Find deletion keeps unrelated references and does not partially unlink Looks', async () => {
  let mutated = false;
  const client = {
    fetch: async () => [
      { _id: 'look-one', _type: 'look', _rev: 'r1', items: [{ find: { _ref: 'find-one' } }] },
      { _id: 'review-one', _type: 'review', title: 'My Review' },
    ],
    transaction: () => {
      mutated = true;
    },
    action: async () => {
      mutated = true;
    },
  } as unknown as Parameters<typeof deleteFind>[0];
  await assert.rejects(() => deleteFind(client, 'find-one'), /My Review/);
  assert.equal(mutated, false);
});

test('Find deletion stops if a Look cannot be updated', async () => {
  let deleted = false;
  const client = {
    fetch: async () => [
      { _id: 'look-one', _type: 'look', _rev: 'r1', items: [{ find: { _ref: 'find-one' } }] },
    ],
    transaction: () => ({
      patch() {
        return this;
      },
      async commit() {
        throw Error('Look changed');
      },
    }),
    action: async () => {
      deleted = true;
    },
  } as unknown as Parameters<typeof deleteFind>[0];
  await assert.rejects(() => deleteFind(client, 'find-one'), /Look changed/);
  assert.equal(deleted, false);
});

test('Find has reusable product identity, distinct experience and approved image entries', async () => {
  const find = document('find');
  assert.equal(field(find.fields, 'experienceStatus').initialValue, 'notTested');
  assert.deepEqual(
    field(find.fields, 'experienceStatus').options?.list?.map((item) => item.value),
    ['notTested', 'received', 'tested'],
  );
  assert.equal(field(find.fields, 'category').to?.[0].type, 'clothingCategory');
  assert.equal(
    find.fields.some((item) => item.name === 'brand'),
    false,
  );
  assert.equal(field(find.fields, 'productImages').of?.[0].type, 'editorialImageEntry');
  assert.equal(field(find.fields, 'editorialImages').of?.[0].type, 'editorialImageEntry');
  assert.equal(
    find.fields.some((item) => item.name === 'price' || item.name === 'availability'),
    false,
  );

  const validate = customValidation(find);
  const validateAmazonUrl = customValidation(field(find.fields, 'amazonUrl'));
  const validateAffiliateUrl = customValidation(field(find.fields, 'affiliateUrl'));
  let candidates: { _id: string; asin?: string; amazonUrl?: string; affiliateUrl?: string }[] = [
    { _id: 'drafts.same', amazonUrl: 'https://amazon.com/dp/B0ABC12345' },
    { _id: 'other', asin: 'B0ABC12345' },
  ];
  const client = { withConfig: () => ({ fetch: async () => candidates }) };
  const context = { getClient: () => client };
  assert.match(
    String(
      await validateAmazonUrl('https://amazon.com/dp/B0ABC12345', {
        ...context,
        document: { _id: 'drafts.same', asin: 'B0DEF67890' },
      }),
    ),
    /Duplicate Find: ASIN B0ABC12345/,
  );
  candidates = [
    { _id: 'other', asin: 'B0DEF67890', amazonUrl: 'https://www.amazon.com/gp/product/B0ABC12345' },
  ];
  assert.match(
    String(
      await validateAmazonUrl('https://amazon.com/dp/B0ABC12345', {
        ...context,
        document: { _id: 'new' },
      }),
    ),
    /Duplicate Find: ASIN B0ABC12345/,
  );
  candidates = [{ _id: 'drafts.other', asin: 'B0ABC12345' }];
  assert.equal(
    await validateAmazonUrl('https://amazon.com/dp/B0ABC12345', {
      ...context,
      document: { _id: 'other' },
    }),
    true,
  );
  assert.match(
    String(
      await validateAffiliateUrl('https://amazon.com/dp/B0ABC12345?tag=example-20', {
        ...context,
        document: { _id: 'new' },
      }),
    ),
    /Duplicate Find: ASIN B0ABC12345/,
  );
  assert.match(
    String(
      await validate(
        { _id: 'new', affiliateUrl: 'https://amzn.to/example', asin: 'B0ABC12345' },
        context,
      ),
    ),
    /Duplicate Find: ASIN B0ABC12345/,
  );
  assert.match(
    String(
      await validate(
        {
          _id: 'new',
          amazonUrl: 'https://amazon.com/dp/B0ABC12345',
          affiliateUrl: 'https://amazon.com/dp/B0DEF12345?tag=example-20',
        },
        context,
      ),
    ),
    /same ASIN/,
  );

  const image = document('editorialImageEntry');
  const validateImageField = customValidation(field(image.fields, 'image'));
  assert.equal(validateImageField(undefined, { document: { _type: 'look' } }), true);
  assert.match(
    String(validateImageField(undefined, { document: { _type: 'find' } })),
    /required for Finds/,
  );
  const validateDescription = customValidation(field(image.fields, 'alt'));
  assert.equal(validateDescription(undefined, { document: { _type: 'look' } }), true);
  assert.equal(validateDescription('  ', { document: { _type: 'look' } }), true);
  assert.match(
    String(validateDescription(undefined, { document: { _type: 'find' } })),
    /required for Finds/,
  );
  assert.equal(validateDescription('A blue blouse', { document: { _type: 'find' } }), true);
  const validateImage = customValidation(image);
  assert.equal(
    validateImage(
      { sourceKind: 'unverified', approvalStatus: 'draft' },
      { document: { _type: 'look' } },
    ),
    true,
  );
  assert.match(
    String(validateImage({ sourceKind: 'unverified', approvalStatus: 'approved' })),
    /Confirm image rights/,
  );
  assert.match(
    String(validateImage({ sourceKind: 'aiGenerated', approvalStatus: 'approved' })),
    /prompt, model/,
  );
  assert.equal(validateImage({ sourceKind: 'original', approvalStatus: 'approved' }), true);
});

test('Looks reference Finds once, preserve order and attach hotspots to included Finds', () => {
  const look = document('look');
  const items = field(look.fields, 'items');
  assert.equal(items.of?.[0].type, 'object');
  assert.equal(field(items.of![0].fields!, 'find').to?.[0].type, 'find');
  const hotspot = field(items.of![0].fields!, 'hotspot');
  assert.deepEqual(
    hotspot.fields?.map((item) => item.name),
    ['x', 'y'],
  );
  assert.equal(field(look.fields, 'coverImage').type, 'editorialImageEntry');
  assert.equal(field(look.fields, 'variations').of?.[0].type, 'object');
  assert.equal(
    field(look.fields, 'variations').of?.[0].fields?.find((f) => f.name === 'image')?.validation,
    undefined,
  );
  const validateItems = customValidation(items);
  assert.equal(validateItems(undefined), true);
  assert.equal(validateItems([]), true);
  assert.match(
    String(validateItems([{ find: { _ref: 'a' } }, { find: { _ref: 'a' } }])),
    /only once/,
  );
  assert.equal(validateItems([{ find: { _ref: 'a' } }, { find: { _ref: 'b' } }]), true);
});

test('Review keeps legacy product links and adds an optional primary Find', () => {
  const review = document('review');
  for (const name of [
    'reviewedProducts',
    'ctaProduct',
    'photos',
    'videoUrl',
    'fitNotes',
    'shannequinQuote',
  ])
    assert.ok(field(review.fields, name));
  assert.equal(field(review.fields, 'primaryFind').to?.[0].type, 'find');
});
