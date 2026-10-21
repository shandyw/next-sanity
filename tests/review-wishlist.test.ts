import test from 'node:test';
import assert from 'node:assert/strict';
import {
  amazonProduct,
  amazonImage,
  parseReviewWishlist,
  wishlistDraft,
  dedupeWishes,
  wishReceived,
  type ReviewWish,
} from '../lib/review-wishlist';
import { matchWishlistRow, importWishlistRow } from '../sanity/review-wishlist/model';
const csv =
  'Name,Price,Rating,Product URL,Image URL,Date Added,Priority,Needs,Has,Comment\n"A shirt, blue",$22.99,4.4,https://www.amazon.com/dp/B0C5R6Q2XZ/?ref=test,https://m.media-amazon.com/images/I/test.jpg,"October 17, 2026",medium,1,0,"Check fit"';
test('Amazon wishlist CSV creates real Curated Finds and preserves editorial ownership', () => {
  const [row] = parseReviewWishlist(csv);
  const draft = wishlistDraft(row);
  assert.equal(draft._type, 'product');
  assert.equal(draft.shoppingSection, 'finds');
  assert.equal(draft.onReviewWishlist, true);
  assert.equal(draft.affiliateLink, false);
  assert.equal(draft.personallyTried, false);
  assert.equal(draft.title, 'A shirt, blue');
  assert.equal(draft.purchaseUrl, 'https://www.amazon.com/dp/B0C5R6Q2XZ');
  const existing: ReviewWish = {
    _id: 'drafts.existing',
    _rev: 'rev',
    title: 'My edited title',
    shoppingSection: 'finds',
    onReviewWishlist: true,
    description: 'Keep my notes',
    receivedQuantity: 1,
    priority: 'high',
    slug: { current: 'my-slug' },
    photos: [{ asset: { _ref: 'photo' }, alt: 'My alt' }],
    affiliateLink: true,
    sourceSnapshot: { name: 'Old CSV item' },
    importOverrides: ['purchaseUrl'],
    purchaseUrl: 'https://www.amazon.com/dp/B0C5R6Q2XZ?tag=mine',
  };
  const updated = wishlistDraft(row, existing);
  assert.equal(updated._id, existing._id);
  for (const field of [
    'title',
    'description',
    'receivedQuantity',
    'priority',
    'slug',
    'photos',
    'affiliateLink',
    'purchaseUrl',
  ])
    assert.deepEqual(updated[field as keyof typeof updated], existing[field]);
  assert.equal('sourceSnapshot' in updated, false);
  assert.equal(draft.referencePrice, '$22.99');
  assert.equal(draft.importedImageUrl, row.sourceImageUrl);
  assert.equal(draft.indexingIntent, 'index');
  assert.equal(draft.contentReviewStatus, 'needs_review');
  assert.throws(
    () => wishlistDraft(row, { ...existing, shoppingSection: 'closet' }),
    /Only Curated Finds/,
  );
  assert.equal(wishReceived(existing), true);
});
test('wishlist identity, duplicates, quantities, and URL allowlists', () => {
  const [row] = parseReviewWishlist(csv);
  const published: ReviewWish = {
    _id: 'a',
    _rev: 'one',
    title: 'Published',
    shoppingSection: 'finds',
    purchaseUrl: row.productUrl,
  };
  const draft = { ...published, _id: 'drafts.a', _rev: 'two', title: 'Draft' };
  assert.deepEqual(dedupeWishes([published, draft]), [draft]);
  assert.equal(matchWishlistRow(row, [draft]), draft);
  assert.throws(() => matchWishlistRow(row, [published, { ...published, _id: 'b' }]), /Multiple/);
  assert.throws(() => parseReviewWishlist(csv + '\n' + csv.split('\n')[1]), /Duplicate/);
  assert.throws(() => parseReviewWishlist(csv.replace(',1,0,', ',no,0,')), /quantity/);
  assert.equal(amazonProduct('https://amazon.com.evil.test/dp/B0C5R6Q2XZ'), undefined);
  assert.equal(amazonProduct('javascript:alert(1)'), undefined);
  assert.equal(amazonImage('https://evil.test/image.jpg'), undefined);
});
test('imports refuse stale previews and create drafts without publishing', async () => {
  const [row] = parseReviewWishlist(csv);
  const saved: unknown[] = [];
  const client = {
    fetch: async () => [],
    create: async (d: unknown) => {
      saved.push(d);
    },
  } as unknown as Parameters<typeof importWishlistRow>[0];
  await importWishlistRow(client, row);
  assert.equal((saved[0] as { _id: string })._id, 'drafts.amazon-find-b0c5r6q2xz');
  await assert.rejects(
    importWishlistRow(client, row, { _id: 'a', _rev: 'changed', title: 'Old' }),
    /changed since preview/,
  );
});

test('wishlist fetch includes later batches and draft pairs once', async () => {
  const { fetchWishlistProducts } = await import('../sanity/review-wishlist/model');
  const docs = Array.from({ length: 220 }, (_, i) => ({
    _id: `p${String(i).padStart(3, '0')}`,
    _rev: 'r',
    title: 'Find',
    shoppingSection: 'finds',
  }));
  docs.push({ ...docs[0], _id: 'drafts.p000' });
  let requests = 0;
  const client = {
    fetch: async (_q: string, { after }: { after: string }) => {
      requests++;
      return docs
        .filter((d) => d._id > after)
        .sort((a, b) => a._id.localeCompare(b._id))
        .slice(0, 200);
    },
  } as unknown as Parameters<typeof fetchWishlistProducts>[0];
  const result = await fetchWishlistProducts(client);
  assert.equal(requests, 2);
  assert.equal(result.length, 220);
  assert.equal(result.find((d) => d._id === 'drafts.p000')?._rev, 'r');
});
