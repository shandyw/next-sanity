import test from 'node:test';
import assert from 'node:assert/strict';
import { Schema } from '@sanity/schema';
import { groupProblems, validateSchema } from '@sanity/schema/_internal';
import { schemaTypes } from '../sanity/schema';

function fields(name: string) {
  const type = schemaTypes.find((entry) => entry.name === name);
  assert.ok(type && 'fields' in type, `${name} is registered`);
  return type.fields as { name: string; type: string }[];
}

test('Studio schema validates and excludes retired inventory document types', () => {
  const problems = groupProblems(validateSchema(schemaTypes).getTypes());
  const errors = problems.flatMap((group) =>
    group.problems.filter((problem) => problem.severity === 'error'),
  );
  assert.deepEqual(errors, []);
  const schema = Schema.compile({ name: 'curvygirlreviews', types: schemaTypes });
  for (const name of ['review', 'find', 'look', 'homepage', 'aboutPage', 'siteSettings', 'brand'])
    assert.ok(schema.get(name), name);
  assert.equal(
    schemaTypes.some((type) => type.name === 'product' || type.name === 'productCollection'),
    false,
  );
  assert.equal(
    fields('review').some((field) => field.name === 'primaryFind'),
    true,
  );
  assert.equal(
    fields('review').some(
      (field) => field.name === 'reviewedProducts' || field.name === 'ctaProduct',
    ),
    false,
  );
  assert.equal(
    fields('siteSettings').some((field) => field.name === 'amazonAssociates'),
    true,
  );
  const reviewsHero = fields('siteSettings').find((field) => field.name === 'reviewsHero');
  assert.equal(reviewsHero?.type, 'object');
  const heroFields = reviewsHero as typeof reviewsHero & {
    fields?: { name: string; type: string }[];
  };
  assert.deepEqual(
    heroFields?.fields?.map((field) => field.name),
    ['mainPhoto', 'smallPhoto'],
  );
  assert.equal(
    fields('siteSettings').find((field) => field.name === 'supportHeroImage')?.type,
    'image',
  );
  const aboutFields = fields('aboutPage');
  assert.equal(aboutFields.find((field) => field.name === 'portrait')?.type, 'image');
  for (const name of ['myMeasurements', 'shannequinMeasurements']) {
    const measurementField = aboutFields.find((field) => field.name === name) as
      { name: string; type: string; fields?: { name: string }[] } | undefined;
    assert.equal(measurementField?.type, 'object');
    assert.deepEqual(
      measurementField?.fields?.map((field) => field.name),
      ['chest', 'waist', 'hips', 'arm', 'wrist', 'inseam'],
    );
  }
});
