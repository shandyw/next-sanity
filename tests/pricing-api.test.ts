import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { defaultInputs } from '../lib/pricing/contracts';
let handle: (r: Request, id: string) => Promise<Response>;
const state: {
  user: string;
  visibility: string;
  docs: Map<string, Record<string, unknown>>;
  privateDocs: Map<string, Record<string, unknown>>;
  assessment: unknown;
  mutations: string[];
  concurrent: boolean;
} = {
  user: 'admin',
  visibility: 'private',
  docs: new Map(),
  privateDocs: new Map(),
  assessment: {
    lowCents: null,
    highCents: null,
    listingCents: null,
    quickCents: null,
    features: [],
    warnings: [],
    explanation: 'Limited evidence',
    evidence: [],
  },
  mutations: [],
  concurrent: false,
};
function client(privateDataset = false) {
  const docs = privateDataset ? state.privateDocs : state.docs;
  const patcher = (id: string) => {
    let revision: string | undefined;
    let fields: Record<string, unknown> = {};
    const patch = {
      ifRevisionId: (v: string) => {
        revision = v;
        return patch;
      },
      set: (v: Record<string, unknown>) => {
        fields = v;
        return patch;
      },
      commit: async () => {
        const doc = docs.get(id);
        if (!doc || (revision && revision !== doc._rev) || (!privateDataset && state.concurrent))
          throw Error('Revision conflict');
        const next = { ...doc, ...fields, _rev: String(Number(doc._rev || 0) + 1) };
        docs.set(id, next);
        state.mutations.push(id);
        return next;
      },
    };
    return patch;
  };
  return {
    config: () => ({ projectId: 'testproject', dataset: 'production' }),
    users: {
      getById: async () => {
        if (state.user === 'invalid') throw Error('Invalid token');
        return { id: state.user };
      },
    },
    datasets: { list: async () => [{ name: 'pricing', aclMode: state.visibility }] },
    withConfig: () => client(true),
    fetch: async (query: string, params: Record<string, string> = {}) => {
      if (query.includes('count(')) return 0;
      if (query.includes("_type=='product'")) {
        return [...state.docs.values()].filter((d) =>
          [params.id, ...((params.ids as unknown as string[]) || [])].includes(String(d._id)),
        );
      }
      let rows = [...docs.values()];
      if (query.includes('pricingAnalysis'))
        rows = rows.filter((d) => d._type === 'pricingAnalysis' && d.status === 'completed');
      else if (query.includes('pricingSale')) rows = rows.filter((d) => d._type === 'pricingSale');
      else if (query.includes('pricingApproval'))
        rows = rows.filter((d) => d._type === 'pricingApproval');
      else if (params.type) rows = rows.filter((d) => d._type === params.type);
      if (params.id) rows = rows.filter((d) => d.productId === params.id);
      if (params.cursor) rows = rows.filter((d) => String(d._id) > params.cursor);
      return rows;
    },
    getDocument: async (id: string) => docs.get(id) || null,
    create: async (doc: Record<string, unknown>) => {
      if (docs.has(String(doc._id))) throw Error('Already exists');
      const next = { ...doc, _rev: '1' };
      docs.set(String(doc._id), next);
      return next;
    },
    patch: patcher,
    transaction: () => {
      const operations: { kind: string; id: string; value?: Record<string, unknown> }[] = [];
      const transaction = {
        patch: (id: string, value: Record<string, unknown>) => {
          operations.push({ kind: 'patch', id, value });
          return transaction;
        },
        delete: (id: string) => {
          operations.push({ kind: 'delete', id });
          return transaction;
        },
        create: (value: Record<string, unknown>) => {
          operations.push({ kind: 'create', id: String(value._id), value });
          return transaction;
        },
        commit: async () => {
          for (const op of operations) {
            if (op.kind === 'patch' && op.value?.ifRevisionID !== docs.get(op.id)?._rev)
              throw Error('Revision conflict');
            if (op.kind === 'create' && docs.has(op.id)) throw Error('Already exists');
          }
          for (const op of operations) {
            if (op.kind === 'delete') docs.delete(op.id);
            if (op.kind === 'create') {
              docs.set(op.id, { ...op.value, _rev: '1' });
              state.mutations.push(op.id);
            }
          }
          return {};
        },
      };
      return transaction;
    },
  };
}
before(async () => {
  const globals = globalThis as typeof globalThis & {
    pricingTestClient?: () => unknown;
    pricingTestAssessment?: () => unknown;
  };
  globals.pricingTestClient = () => client();
  globals.pricingTestAssessment = () => state.assessment;
  const output = await build({
    stdin: {
      contents: "export {handlePricing} from './lib/pricing/server';",
      resolveDir: process.cwd(),
    },
    bundle: true,

    platform: 'node',
    format: 'esm',
    write: false,
    plugins: [
      {
        name: 'isolated-provider-and-datasets',
        setup(b) {
          b.onResolve({ filter: /^(server-only|@sanity\/client)$/ }, (args) => ({
            path: args.path,
            namespace: 'mock',
          }));
          b.onResolve({ filter: /^next-sanity$/ }, () => ({
            path: pathToFileURL(
              createRequire(`${process.cwd()}/package.json`).resolve('next-sanity'),
            ).href,
            external: true,
          }));
          b.onResolve({ filter: /^\.\/provider$/ }, () => ({
            path: 'provider',
            namespace: 'mock',
          }));
          b.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
            contents:
              args.path === 'server-only'
                ? ''
                : args.path === 'provider'
                  ? "export async function assessItem(){return {assessment:globalThis.pricingTestAssessment(),provider:'test',model:'fixture'};}"
                  : 'export function createClient(){return globalThis.pricingTestClient();}',
            loader: 'js',
          }));
        },
      },
    ],
  });
  handle = (
    await import(
      'data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].text).toString('base64')
    )
  ).handlePricing;
});
function reset() {
  state.user = 'admin';
  state.visibility = 'private';
  state.privateDocs.clear();
  state.docs.clear();
  state.mutations = [];
  state.concurrent = false;
  state.docs.set('item', {
    _id: 'item',
    _rev: '1',
    _type: 'product',
    title: 'Blouse',
    currency: 'USD',
    availability: 'available',
    listingPrice: 20,
    description: 'Preserve editorial description',
    imageUrls: [],
  });
  state.assessment = {
    lowCents: null,
    highCents: null,
    listingCents: null,
    quickCents: null,
    features: [],
    warnings: [],
    explanation: 'Limited',
    evidence: [],
  };
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'testproject';
  process.env.NEXT_PUBLIC_SANITY_DATASET = 'production';
  process.env.SANITY_PRICING_DATASET = 'pricing';
  process.env.PRICING_ADMIN_USER_IDS = 'admin';
  process.env.OPENAI_API_KEY = 'test-only';
  process.env.PRICING_AI_MODEL = 'test-model';
}
const request = (body?: unknown, auth = true) =>
  new Request('http://localhost/api/studio/pricing/item', {
    method: body ? 'POST' : 'GET',
    headers: auth ? { Authorization: 'Bearer ' + 't'.repeat(30) } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
async function analyze() {
  return await handle(
    request({
      action: 'analyze',
      requestId: crypto.randomUUID(),
      expectedRevision: '1',
      inputs: defaultInputs,
    }),
    'item',
  );
}
test('pricing endpoints reject unauthenticated, unapproved users and public storage', async () => {
  reset();
  assert.equal((await handle(request(undefined, false), 'item')).status, 401);
  state.user = 'invalid';
  assert.equal((await handle(request(), 'item')).status, 401);
  state.user = 'viewer';
  assert.equal((await handle(request(), 'item')).status, 403);
  state.user = 'admin';
  state.visibility = 'public';
  assert.equal((await handle(request(), 'item')).status, 503);
  assert.equal(state.privateDocs.size, 0);
});
test('server excludes Curated Finds and affiliate products and selects the draft', async () => {
  reset();
  state.docs.set('drafts.item', {
    ...state.docs.get('item'),
    _id: 'drafts.item',
    shoppingSection: 'finds',
  });
  assert.equal((await handle(request(), 'item')).status, 403);
  state.docs.delete('drafts.item');
  state.docs.set('item', { ...state.docs.get('item'), affiliateLink: true });
  assert.equal((await handle(request(), 'item')).status, 403);
});
test('analysis remains private, rejects fabricated evidence and never updates asking price', async () => {
  reset();
  state.assessment = {
    ...(state.assessment as object),
    evidence: [{ id: 'fabricated', relevant: true, reason: 'fake' }],
  };
  assert.equal((await analyze()).status, 502);
  assert.equal(state.docs.get('item')!.listingPrice, 20);
  assert.equal(
    [...state.privateDocs.values()].find((d) => d._type === 'pricingAnalysis')?.status,
    'failed',
  );
});
test('approved pricing changes only the draft; retries deduplicate and stale inputs are rejected', async () => {
  reset();
  const result = await analyze();
  assert.equal(result.status, 200);
  const analysis = await result.json();
  const body = {
    action: 'apply',
    requestId: crypto.randomUUID(),
    analysisId: analysis._id,
    expectedRevision: '1',
    chosenCents: 1800,
    inputs: defaultInputs,
    reviewedOutdated: false,
    approved: true,
  };
  assert.equal((await handle(request({ ...body, approved: false }), 'item')).status, 400);
  assert.equal(
    (
      await handle(
        request({ ...body, inputs: { ...defaultInputs, desiredProfitCents: 1 } }),
        'item',
      )
    ).status,
    409,
  );
  assert.equal((await handle(request(body), 'item')).status, 200);
  assert.equal(state.docs.get('item')!.listingPrice, 20);
  assert.equal(state.docs.get('drafts.item')!.listingPrice, 18);
  assert.equal(state.docs.get('drafts.item')!.description, 'Preserve editorial description');
  assert.equal((await handle(request({ ...body, expectedRevision: '0' }), 'item')).status, 409);
  assert.equal(state.mutations.filter((id) => id === 'drafts.item').length, 1);
});
test('sold items cannot apply prices, actual sale preserves unknown costs, revision conflicts fail safely', async () => {
  reset();
  const analysis = await (await analyze()).json();
  const body = {
    action: 'apply',
    requestId: crypto.randomUUID(),
    analysisId: analysis._id,
    expectedRevision: '1',
    chosenCents: 1800,
    inputs: defaultInputs,
    reviewedOutdated: false,
    approved: true,
  };
  state.docs.set('drafts.item', {
    ...state.docs.get('item'),
    _id: 'drafts.item',
    availability: 'sold',
  });
  assert.equal((await handle(request(body), 'item')).status, 409);
  const sale = await handle(
    request({
      action: 'sale',
      requestId: crypto.randomUUID(),
      saleCents: 1000,
      soldAt: '2026-10-01',
      listedAt: '',
      acquisitionCents: null,
      expensesCents: 100,
    }),
    'item',
  );
  assert.equal(sale.status, 200);
  const recorded = await sale.json();
  assert.equal(recorded.netCents, 900);
  assert.equal(recorded.profitCents, null);
  state.docs.set('drafts.item', { ...state.docs.get('drafts.item'), availability: 'available' });
  state.concurrent = true;
  assert.equal((await handle(request(body), 'item')).status, 502);
  assert.equal(state.docs.get('drafts.item')!.listingPrice, 20);
});
test('currency changes discard saved cost defaults and require a new assessment even with explicit review', async () => {
  reset();
  const analysis = await (await analyze()).json();
  state.docs.set('item', { ...state.docs.get('item'), currency: 'GBP', _rev: '2' });
  const data = await (await handle(request(), 'item')).json();
  assert.equal(data.item.currency, 'GBP');
  assert.deepEqual(data.inputs, defaultInputs);
  assert.equal(data.latest.product.currency, 'USD');
  const response = await handle(
    request({
      action: 'apply',
      requestId: crypto.randomUUID(),
      analysisId: analysis._id,
      expectedRevision: '2',
      chosenCents: 1800,
      inputs: defaultInputs,
      reviewedOutdated: true,
      approved: true,
    }),
    'item',
  );
  assert.equal(response.status, 409);
  assert.match((await response.json()).message, /currency changed/i);
  assert.equal(state.docs.has('drafts.item'), false);
});
