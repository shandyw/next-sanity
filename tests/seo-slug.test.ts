import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSeoSlug } from '../sanity/seo-slug';
import { schemaTypes } from '../sanity/schema';

test('generated slugs favor three to five meaningful title words', () => {
  assert.equal(
    generateSeoSlug('The Best Plus Size Jeans for Fall and Winter'),
    'best-plus-size-jeans-fall',
  );
  assert.equal(generateSeoSlug('My Closet'), 'my-closet');
  assert.equal(generateSeoSlug('Café Dresses for Summer'), 'cafe-dresses-summer');
});

test('generated slugs stay below 75 characters without cutting a later word', () => {
  const slug = generateSeoSlug(
    'Extraordinarilybeautiful Extraordinarilycomfortable Extraordinarilyversatile Outfits for Work',
  );
  assert.ok(slug.length < 75);
  assert.equal(slug, 'extraordinarilybeautiful-extraordinarilycomfortable');
});

test('Finds, Looks, reviews, and blog posts use the same slug generator', () => {
  for (const name of ['find', 'look', 'review', 'blogPost']) {
    const document = schemaTypes.find((item) => item.name === name);
    assert.ok(document && 'fields' in document, `${name} schema exists`);
    const slug = document.fields.find((field) => field.name === 'slug');
    assert.ok(slug && 'options' in slug, `${name} slug exists`);
    const options = slug.options;
    assert.ok(options && 'slugify' in options);
    assert.equal(options.slugify, generateSeoSlug);
    assert.equal(options.maxLength, 74);
  }
});
