import { EditorialLink } from '../components/EditorialLink';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  amazonLink,
  productPhotos,
  productDescription,
  productIndexable,
  experienceStatus,
  ordinaryAmazonUrl,
  validAmazonAffiliateUrl,
} from '../lib/amazon';
import { shoppingPrice, shoppingSizes } from '../lib/shopping';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { ProductAction } from '../components/ProductAction';
import type { DocumentContent, Settings } from '../lib/types';
const product: DocumentContent = {
  _id: 'amazon-item',
  _type: 'product',
  title: 'A selected blouse',
  slug: 'blouse',
  shoppingSection: 'finds',
  retailer: 'Amazon',
  purchaseUrl: 'https://www.amazon.com/dp/B0C5R6Q2XZ?tag=old-20',
  affiliateLink: true,
  listingPrice: 22,
  currency: 'USD',
  priceMaintained: true,
  availableSizes: ['16'],
  availability: 'available',
  description: 'Unreviewed imported description',
  importedImageUrl: 'https://m.media-amazon.com/images/I/test.jpg',
};
const active: Settings = { amazonAssociates: { active: true, tag: 'site-20' } };
test('Amazon ordinary/active/tagged and short links fail safely without changing source records', () => {
  assert.equal(amazonLink(product)?.href, 'https://www.amazon.com/dp/B0C5R6Q2XZ');
  assert.equal(amazonLink(product)?.affiliate, false);
  assert.equal(
    amazonLink(product, active)?.href,
    'https://www.amazon.com/dp/B0C5R6Q2XZ?tag=site-20',
  );
  assert.equal(amazonLink(product, active)?.affiliate, true);
  assert.equal(amazonLink({ ...product, affiliateLink: false }, active)?.affiliate, false);
  assert.equal(amazonLink({ ...product, onReviewWishlist: true }, active)?.affiliate, false);
  const generated = 'https://www.amazon.com/dp/B0C5R6Q2XZ?tag=site-20&linkCode=ll1&linkId=static';
  assert.equal(amazonLink({ ...product, amazonAffiliateUrl: generated }, active)?.href, generated);
  assert.equal(
    amazonLink({ ...product, amazonAffiliateUrl: generated.replace('site-20', 'other-20') }, active)
      ?.affiliate,
    false,
  );
  assert.equal(
    validAmazonAffiliateUrl('https://amazon.com.evil.test/?tag=site-20', 'site-20'),
    undefined,
  );
  assert.equal(validAmazonAffiliateUrl('https://amzn.to/abc123', 'site-20'), undefined);
  assert.equal(
    validAmazonAffiliateUrl('https://amzn.to/abc123', 'site-20', true),
    'https://amzn.to/abc123',
  );
  assert.equal(ordinaryAmazonUrl('https://amzn.to/abc123'), undefined);
  assert.equal(
    amazonLink(product, { amazonAssociates: { active: true, tag: 'invalid' } })?.affiliate,
    false,
  );
  assert.equal(product.purchaseUrl, 'https://www.amazon.com/dp/B0C5R6Q2XZ?tag=old-20');
});
test('Amazon public data guards do not affect closet prices/photos', () => {
  assert.equal(shoppingPrice(product), undefined);
  assert.deepEqual(shoppingSizes(product), []);
  assert.equal(productDescription(product), '');
  const photos = [
    { alt: 'Unknown', asset: { _ref: 'a' } },
    { alt: 'Owned', asset: { _ref: 'b' }, sourceKind: 'original' as const },
    {
      alt: 'Licensed',
      asset: { _ref: 'c' },
      sourceKind: 'licensed' as const,
      sourceCredit: 'Photographer permission reference',
    },
  ];
  assert.equal(productPhotos({ ...product, photos }).length, 2);
  const closet = {
    ...product,
    shoppingSection: 'closet' as const,
    retailer: undefined,
    amazonAsin: undefined,
    importedImageUrl: undefined,
    purchaseUrl: 'https://www.vinted.com/items/12345',
    photos,
  };
  assert.equal(shoppingPrice(closet), 22);
  assert.equal(productPhotos(closet).length, 3);
});
test('indexing requires a deliberate original editorial treatment, not an arbitrary word count', () => {
  assert.equal(productIndexable(product), false);
  const ready = {
    ...product,
    indexingIntent: 'index' as const,
    contentReviewStatus: 'approved' as const,
    whyPicked: 'I selected this neckline as a layering option.',
    whatToCheck: 'Compare shoulder and bust measurements; I have not worn it.',
    editorialReviewedAt: '2026-10-18',
  };
  assert.equal(productIndexable(ready), true);
  assert.equal(productIndexable({ ...ready, indexingIntent: undefined }), true);
  assert.equal(productIndexable({ ...ready, indexingIntent: 'noindex' }), false);
  assert.equal(productIndexable({ ...ready, experienceStatus: 'mannequin' }), false);
  assert.equal(
    productIndexable({
      ...ready,
      experienceStatus: 'mannequin',
      fitObservations: 'Shown on Shannequin; no human comfort claim.',
    }),
    true,
  );
  assert.equal(
    experienceStatus({ ...product, personallyTried: true, experienceStatus: 'mannequin' }),
    'mannequin',
  );
});
test('Amazon actions label the destination and only disclose commission for eligible active links', () => {
  const ordinary = renderToStaticMarkup(createElement(ProductAction, { product }));
  assert.match(ordinary, /View on Amazon/);
  assert.doesNotMatch(ordinary, /As an Amazon Associate|sponsored|tag=old/);
  const tagged = renderToStaticMarkup(createElement(ProductAction, { product, settings: active }));
  assert.match(tagged, /As an Amazon Associate/);
  assert.match(tagged, /sponsored/);
  assert.match(tagged, /tag=site-20/);
});

test('guide/review links share inactive and active link decisions', () => {
  const ordinary = renderToStaticMarkup(
    EditorialLink({
      href: product.purchaseUrl,
      affiliate: true,
      sourceId: 'guide',
      placement: 'guide',
      children: 'See the blouse',
    }),
  );
  assert.match(ordinary, /See the blouse.*Amazon/);
  assert.doesNotMatch(ordinary, /tag=|sponsored|paid link/);
  const affiliate = renderToStaticMarkup(
    EditorialLink({
      href: product.purchaseUrl,
      affiliate: true,
      sourceId: 'guide',
      placement: 'guide',
      settings: active,
      children: 'See the blouse',
    }),
  );
  assert.match(affiliate, /tag=site-20/);
  assert.match(affiliate, /sponsored/);
  assert.match(affiliate, /paid link/);
  const wrong = amazonLink(
    { ...product, amazonAffiliateUrl: 'https://www.amazon.com/dp/B000000000?tag=site-20' },
    active,
  );
  assert.equal(wrong?.affiliate, false);
});
