import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Schema } from '@sanity/schema';
import { groupProblems, validateSchema } from '@sanity/schema/_internal';
import {
  fashionModelSizes,
  isEligibleFashionModel,
  selectFashionModel,
  type AiFashionModel,
} from '../lib/ai-fashion-models';
import { schemaTypes } from '../sanity/schema';

const complete = (id: string): AiFashionModel => ({
  _id: id,
  name: `Model ${id}`,
  active: true,
  clothingSize: '16/18',
  measurements: { height: 66, bust: 45, waist: 38, hips: 48 },
  appearance: { skinTone: 'warm brown', hairstyle: 'short curls' },
  identityPrompt:
    'Fictional adult with short curls, a distinct oval face, and balanced natural body proportions.',
  referenceImage: { asset: { _ref: 'image-approved-100x150-jpg' } },
  referenceImageAlt: 'Fictional AI model reference portrait',
  referenceImageSource: 'aiGenerated',
  referenceImageRights: 'Editor-created image with rights for editorial AI reference use.',
  referenceImageApproval: 'approved',
});

type TestField = {
  name: string;
  type?: string;
  initialValue?: unknown;
  options?: { list?: { value: string }[] };
  fields?: TestField[];
  to?: { type: string }[];
  validation?: (rule: never) => unknown;
};

function field(name: string) {
  const schema = schemaTypes.find((type) => type.name === 'aiFashionModel');
  assert.ok(schema && 'fields' in schema);
  const result = schema.fields.find((item) => item.name === name);
  assert.ok(result, name);
  return result as unknown as TestField;
}

function validationCalls(target: { validation?: (rule: never) => unknown }) {
  assert.ok(target.validation);
  const calls: [string, number?][] = [];
  let custom: ((value: unknown, context?: unknown) => unknown) | undefined;
  const rule = {
    required() {
      calls.push(['required']);
      return rule;
    },
    min(value: number) {
      calls.push(['min', value]);
      return rule;
    },
    max(value: number) {
      calls.push(['max', value]);
      return rule;
    },
    custom(fn: typeof custom) {
      custom = fn;
      calls.push(['custom']);
      return rule;
    },
  };
  target.validation(rule as never);
  return { calls, custom };
}

test('AI Fashion Model schema is registered with publication and image safeguards', async () => {
  const problems = groupProblems(validateSchema(schemaTypes).getTypes());
  assert.deepEqual(
    problems.flatMap((group) => group.problems.filter((problem) => problem.severity === 'error')),
    [],
  );
  const schema = Schema.compile({ name: 'curvygirlreviews', types: schemaTypes });
  assert.ok(schema.get('aiFashionModel'));
  assert.deepEqual(field('active').initialValue, true);
  assert.deepEqual(field('referenceImageApproval').initialValue, 'draft');
  assert.deepEqual(field('clothingSize').options?.list, [...fashionModelSizes]);
  for (const name of [
    'name',
    'clothingSize',
    'measurements',
    'identityPrompt',
    'referenceImage',
    'referenceImageAlt',
    'referenceImageSource',
    'referenceImageRights',
    'referenceImageApproval',
  ]) {
    assert.ok(
      validationCalls(field(name)).calls.some(([call]) => call === 'required'),
      `${name} is required for publication`,
    );
  }
  const measurements = field('measurements');
  assert.ok(measurements.fields);
  for (const [name, min, max] of [
    ['height', 48, 84],
    ['bust', 20, 80],
    ['waist', 20, 70],
    ['hips', 20, 90],
  ] as const) {
    const measurement: TestField | undefined = measurements.fields.find(
      (item) => item.name === name,
    );
    assert.ok(measurement);
    assert.deepEqual(validationCalls(measurement).calls, [
      ['required'],
      ['min', min],
      ['max', max],
    ]);
  }
  assert.deepEqual(
    field('referenceImageSource').options?.list?.map((choice) => choice.value),
    ['aiGenerated', 'licensed'],
  );
  assert.equal(field('referenceImage').type, 'image');
  const model = schemaTypes.find((type) => type.name === 'aiFashionModel') as unknown as {
    preview: {
      prepare: (value: {
        title: string;
        size: string;
        active: boolean;
        approval: string;
        media: string;
      }) => { title: string; subtitle?: string; media?: unknown };
    };
    validation?: (rule: never) => unknown;
  };
  assert.ok(model?.preview);
  const preview = model.preview.prepare({
    title: 'Mara Ellis',
    size: '16',
    active: true,
    approval: 'draft',
    media: 'photo',
  });
  assert.equal(preview.title, 'Mara Ellis');
  assert.match(preview.subtitle || '', /US 16 · Active · Reference draft/);
  assert.equal(preview.media, 'photo');
  const publish = validationCalls(model).custom;
  assert.equal(publish?.({ referenceImageApproval: 'approved' }), true);
  assert.match(
    String(publish?.({ referenceImageApproval: 'draft' })),
    /Approve the primary reference/,
  );
  const nameCheck = validationCalls(field('name')).custom;
  const context = {
    document: { _id: 'drafts.model-one' },
    getClient: () => ({
      withConfig: () => ({
        fetch: async () => [
          { _id: 'model-one', name: 'Mara Ellis' },
          { _id: 'model-two', name: 'Nia Calder' },
        ],
      }),
    }),
  };
  assert.equal(await nameCheck?.('Mara Ellis', context), true);
  assert.match(String(await nameCheck?.(' nia calder ', context)), /already uses this name/);
});

test('Find and Look AI image entries can retain an optional model reference', () => {
  for (const typeName of ['editorialImageEntry', 'lookImageEntry']) {
    const type = schemaTypes.find((item) => item.name === typeName);
    assert.ok(type && 'fields' in type);
    const ref = type.fields.find((item) => item.name === 'fashionModel');
    assert.ok(ref && ref.type === 'reference');
    assert.equal(ref.to?.[0]?.type, 'aiFashionModel');
  }
});

test('selection uses only complete, active, approved, published identities', () => {
  const one = complete('one');
  const two = complete('two');
  const candidates = [
    one,
    { ...complete('inactive'), active: false },
    { ...complete('missing-photo'), referenceImage: undefined },
    { ...complete('draft-image'), referenceImageApproval: 'draft' as const },
    { ...complete('missing-rights'), referenceImageRights: ' ' },
    { ...complete('missing-prompt'), identityPrompt: 'too short' },
    { ...complete('bad-size'), clothingSize: '14' as AiFashionModel['clothingSize'] },
    { ...complete('bad-measurement'), measurements: { height: 66, bust: 0, waist: 38, hips: 48 } },
    complete('drafts.unpublished'),
    two,
  ];
  const originalIds = candidates.map((model) => model._id);
  assert.deepEqual(
    candidates.filter(isEligibleFashionModel).map((model) => model._id),
    ['one', 'two'],
  );
  assert.deepEqual(selectFashionModel(candidates, { random: () => 0 }), { ok: true, model: one });
  assert.deepEqual(selectFashionModel(candidates, { random: () => 0.999 }), {
    ok: true,
    model: two,
  });
  assert.deepEqual(
    candidates.map((model) => model._id),
    originalIds,
  );
});

test('manual selection never silently substitutes another model', () => {
  const one = complete('one');
  assert.deepEqual(
    selectFashionModel([one], {
      modelId: 'one',
      random: () => {
        throw Error('random called');
      },
    }),
    { ok: true, model: one },
  );
  assert.deepEqual(selectFashionModel([one], { modelId: 'missing' }), {
    ok: false,
    reason: 'unavailable',
    requestedId: 'missing',
  });
  assert.deepEqual(selectFashionModel([{ ...one, active: false }], { modelId: 'one' }), {
    ok: false,
    reason: 'unavailable',
    requestedId: 'one',
  });
  assert.deepEqual(selectFashionModel([], { modelId: 'one' }), {
    ok: false,
    reason: 'unavailable',
    requestedId: 'one',
  });
});

test('empty and single-model libraries have deterministic results', () => {
  assert.deepEqual(selectFashionModel([]), { ok: false, reason: 'empty' });
  assert.deepEqual(selectFashionModel([{ ...complete('one'), referenceImageApproval: 'draft' }]), {
    ok: false,
    reason: 'empty',
  });
  const one = complete('one');
  assert.deepEqual(selectFashionModel([one], { random: () => 0.5 }), { ok: true, model: one });
  assert.throws(() => selectFashionModel([one], { random: () => 1 }), RangeError);
});

test('six proposal profiles are varied and cannot become eligible without editorial approval', () => {
  const proposals = JSON.parse(
    readFileSync('docs/PHASE-3A-MODEL-PROPOSALS.json', 'utf8'),
  ) as AiFashionModel[];
  assert.equal(proposals.length, 6);
  assert.equal(new Set(proposals.map((model) => model.name)).size, 6);
  assert.equal(new Set(proposals.map((model) => model.measurements?.height)).size, 6);
  assert.equal(new Set(proposals.map((model) => model.bodyShape)).size, 5);
  assert.ok(
    proposals.every(
      (model) =>
        model.active === false && !model.referenceImage && model.referenceImageApproval === 'draft',
    ),
  );
  assert.ok(proposals.every((model) => !isEligibleFashionModel(model)));
});
