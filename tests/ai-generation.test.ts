import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approvedEditorialEntry,
  buildFashionPrompt,
  imageDigest,
  isAllowedImageEditor,
  findAuthorizedProductReference,
  signPayload,
  validateGenerationInput,
  verifyPayload,
  type ApprovalTicket,
  type GenerationSession,
} from '../lib/ai-generation';
import { requestOpenAiFashionImages } from '../lib/ai-generation-provider';
import { POST } from '../app/api/studio/find-image/route';
import { selectFashionModel, type AiFashionModel } from '../lib/ai-fashion-models';

const secret = '0123456789abcdef0123456789abcdef';
const model: AiFashionModel = {
  _id: 'model-one',
  name: 'Mara',
  active: true,
  clothingSize: '16/18',
  measurements: { height: 66, bust: 45, waist: 38, hips: 48 },
  identityPrompt:
    'Fictional adult with natural curves, short dark curls, and a distinct oval face.',
  referenceImage: { asset: { _ref: 'image-model' } },
  referenceImageAlt: 'Model reference',
  referenceImageSource: 'aiGenerated',
  referenceImageRights: 'Owned reference',
  referenceImageApproval: 'approved',
};
const session: GenerationSession = {
  userId: 'editor-one',
  findId: 'find-one',
  modelId: 'model-one',
  productImageKey: 'photo-one',
  styling: 'Warm editorial layers',
  count: 2,
  expiresAt: Date.now() + 60_000,
};

test('generation input validates product reference, styling, and 1–3 variations', () => {
  assert.deepEqual(validateGenerationInput({ ...session, findId: 'drafts.find-one', count: 2 }), {
    findId: 'find-one',
    modelId: 'model-one',
    productImageKey: 'photo-one',
    styling: 'Warm editorial layers',
    count: 2,
  });
  assert.throws(() => validateGenerationInput({ ...session, count: 4 }), /one to three/);
  assert.throws(
    () => validateGenerationInput({ ...session, productImageKey: '' }),
    /authorized product reference/,
  );
  assert.throws(
    () => validateGenerationInput({ ...session, styling: 'short' }),
    /styling instructions/,
  );
});

test('authorization and product-reference rights fail closed', () => {
  assert.equal(isAllowedImageEditor('owner', ['owner']), true);
  assert.equal(isAllowedImageEditor('viewer', ['owner']), false);
  assert.equal(isAllowedImageEditor(undefined, ['owner']), false);
  const image = {
    _key: 'photo',
    image: { asset: { _ref: 'image-photo' } },
    sourceKind: 'original',
    approvalStatus: 'approved',
    aiReferenceAuthorized: true,
    aiReferenceRights: 'Photographed and owned by editor',
  };
  assert.deepEqual(findAuthorizedProductReference([image], 'photo'), {
    assetId: 'image-photo',
    rights: 'Photographed and owned by editor',
  });
  assert.throws(
    () => findAuthorizedProductReference([{ ...image, aiReferenceAuthorized: false }], 'photo'),
    /explicit AI-reference rights/,
  );
  assert.throws(
    () => findAuthorizedProductReference([{ ...image, sourceKind: 'unverified' }], 'photo'),
    /approved product photo/,
  );
  assert.throws(
    () => findAuthorizedProductReference([{ ...image, aiReferenceRights: '' }], 'photo'),
    /explicit AI-reference rights/,
  );
});

test('prompt preserves model measurements and product facts while labeling styling concepts', () => {
  const choice = selectFashionModel([model], { modelId: 'model-one' });
  assert.equal(choice.ok, true);
  if (!choice.ok) return;
  const prompt = buildFashionPrompt({
    model: choice.model,
    productTitle: 'Blue linen blouse',
    category: 'Tops',
    productDescription: 'Blue and white stripes',
    styling: 'Warm daylight and tailored trousers',
  });
  for (const phrase of [
    'image 1',
    'image 2',
    'US 16/18',
    'bust 45 in',
    'Blue linen blouse',
    'Blue and white stripes',
    'Warm daylight',
    'not a product listing photograph',
    'Do not slim',
  ])
    assert.ok(prompt.includes(phrase), phrase);
});

test('signed session keeps model identity across retries and rejects changes or expiry', () => {
  const token = signPayload(session, secret);
  assert.deepEqual(verifyPayload<GenerationSession>(token, secret), session);
  assert.equal(verifyPayload<GenerationSession>(token, secret).modelId, 'model-one');
  assert.throws(() => verifyPayload(`${token.slice(0, -1)}X`, secret), /Invalid session/);
  assert.throws(
    () => verifyPayload(signPayload({ ...session, expiresAt: Date.now() - 1 }, secret), secret),
    /expired/,
  );
});

test('approval metadata is complete and tied to exact preview bytes', () => {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const ticket: ApprovalTicket = {
    session,
    digest: imageDigest(bytes),
    generatedAt: '2026-11-05T00:00:00.000Z',
    providerModel: 'gpt-image-2.5-flare',
    expiresAt: session.expiresAt,
    prompt: 'Editorial prompt',
  };
  assert.notEqual(imageDigest(Buffer.from([0xff, 0xd8, 0x00, 0xd9])), ticket.digest);
  const entry = approvedEditorialEntry({
    assetId: 'image-result',
    alt: 'Fictional model wearing a blouse',
    ticket,
    prompt: 'Editorial prompt',
    productAssetId: 'image-product',
    productRights: 'Owner photo',
  });
  assert.equal(entry.approvalStatus, 'approved');
  assert.equal(entry.selected, false);
  assert.equal(entry.fashionModel._ref, 'model-one');
  assert.equal(entry.productReferenceAssetId, 'image-product');
  assert.equal(entry.productReferenceRights, 'Owner photo');
  assert.equal(entry.generationDigest, ticket.digest);
});

test('mocked provider sends verified edit parameters and handles rate limits without live calls', async () => {
  let called = 0;
  const fetcher: typeof fetch = async (_url, init) => {
    called++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, 'gpt-image-2.5-flare');
    assert.deepEqual(body.images, [
      { image_url: 'https://cdn.sanity.io/images/model' },
      { image_url: 'https://cdn.sanity.io/images/product' },
    ]);
    assert.equal(body.n, 2);
    assert.equal(body.quality, 'low');
    return Response.json({ data: [{ b64_json: '/9j/2Q==' }, { b64_json: '/9j/2Q==' }] });
  };
  const base = {
    apiKey: 'mock-key',
    model: 'gpt-image-2.5-flare',
    modelImageUrl: 'https://cdn.sanity.io/images/model',
    productImageUrl: 'https://cdn.sanity.io/images/product',
    prompt: 'fashion',
    count: 2,
    editorId: 'editor-one',
  };
  assert.deepEqual(await requestOpenAiFashionImages({ ...base, fetcher }), {
    ok: true,
    images: ['/9j/2Q==', '/9j/2Q=='],
  });
  assert.equal(called, 1);
  const limited = await requestOpenAiFashionImages({
    ...base,
    fetcher: async () => new Response('', { status: 429, headers: { 'Retry-After': '45' } }),
  });
  assert.deepEqual(limited, { ok: false, status: 429, retryAfter: '45' });
  const unavailable = await requestOpenAiFashionImages({
    ...base,
    fetcher: async () => new Response('', { status: 503 }),
  });
  assert.deepEqual(unavailable, { ok: false, status: 503 });
});

test('route rejects cross-origin and unauthenticated requests before any provider call', async () => {
  const prior = {
    project: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    signing: process.env.AI_IMAGE_SIGNING_SECRET,
    editors: process.env.AI_IMAGE_EDITOR_IDS,
  };
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'testproject';
  process.env.NEXT_PUBLIC_SANITY_DATASET = 'test';
  process.env.AI_IMAGE_SIGNING_SECRET = secret;
  process.env.AI_IMAGE_EDITOR_IDS = 'editor-one';
  try {
    const foreign = await POST(
      new Request('https://example.test/api/studio/find-image', {
        method: 'POST',
        headers: { Origin: 'https://evil.test' },
        body: '{}',
      }),
    );
    assert.equal(foreign.status, 403);
    const anonymous = await POST(
      new Request('https://example.test/api/studio/find-image', {
        method: 'POST',
        headers: { Origin: 'https://example.test' },
        body: '{}',
      }),
    );
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.headers.get('cache-control'), 'no-store, private');
  } finally {
    for (const [key, value] of [
      ['NEXT_PUBLIC_SANITY_PROJECT_ID', prior.project],
      ['NEXT_PUBLIC_SANITY_DATASET', prior.dataset],
      ['AI_IMAGE_SIGNING_SECRET', prior.signing],
      ['AI_IMAGE_EDITOR_IDS', prior.editors],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
