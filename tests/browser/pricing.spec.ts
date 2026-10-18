import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { defaultInputs, type PricingData, type PricingInputs } from '../../lib/pricing/contracts';
let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents:
        "import React from 'react';import{createRoot}from'react-dom/client';import{ThemeProvider,studioTheme}from'@sanity/ui';import{PriceButton}from'./sanity/pricing/PricingPanel';createRoot(document.getElementById('fixture')).render(<ThemeProvider theme={studioTheme}><PriceButton id='item'/></ThemeProvider>);",
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [
      {
        name: 'studio-user-fixture',
        setup(b) {
          b.onResolve({ filter: /^sanity(\/router)?$/ }, (a) => ({
            path: a.path,
            namespace: 'mock',
          }));
          b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
            loader: 'tsx',
            resolveDir: process.cwd(),
            contents:
              a.path === 'sanity/router'
                ? "import React from 'react';export const IntentLink=({children,params,...props})=><a {...props} href={'/studio/structure/product;'+params.id}>{children}</a>;"
                : "const token='t'.repeat(30);const client={config:()=>({token})};export const useClient=()=>client;export const useSource=()=>({auth:{}});",
          }));
        },
      },
    ],
  });
  fixture = result.outputFiles[0].text;
});
async function open(page: import('@playwright/test').Page, width: number) {
  await page.setViewportSize({ width, height: 1000 });
  await page.route('http://localhost:3000/pricing-fixture', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: '<html lang="en"><head><title>Pricing test</title></head><body style="margin:0"><main id="fixture"></main></body></html>',
    }),
  );
  await page.goto('/pricing-fixture');
  await page.addStyleTag({
    content: readFileSync('node_modules/@sanity/ui/dist/styles.css', 'utf8'),
  });
  await page.addScriptTag({ content: fixture });
  await page.getByRole('button', { name: 'Price This Item', exact: true }).click();
}
function data(): PricingData {
  return {
    item: {
      _id: 'drafts.item',
      _rev: 'r1',
      _type: 'product',
      title: 'Linen blouse',
      sku: 'CGR-001',
      description: 'A used linen blouse',
      brandName: 'Acme',
      currency: 'USD',
      listingPrice: 20,
      availability: 'available',
      condition: 'Good',
    },
    inputs: { ...defaultInputs },
    history: [],
    latest: null,
    approvals: [],
    sales: [],
    ownSales: [],
    nextCursor: null,
    aiReady: true,
    userId: 'admin',
  };
}
for (const width of [1440, 390])
  test(`private pricing dialog, approval and keyboard at ${width}px`, async ({ page }) => {
    const current = data();
    const actions: Record<string, unknown>[] = [];
    await page.route('**/api/studio/pricing/item', async (route) => {
      const request = route.request();
      expect(request.headers().authorization).toBe('Bearer ' + 't'.repeat(30));
      if (request.method() === 'GET') return route.fulfill({ json: current });
      const body = request.postDataJSON();
      actions.push(body);
      if (body.action === 'analyze') {
        const analysis = {
          _id: 'pricing-analysis-' + 'a'.repeat(64),
          productId: 'item',
          product: { ...current.item },
          inputs: body.inputs as PricingInputs,
          fingerprint: 'fixture',
          analyzedAt: '2026-10-11T12:00:00Z',
          confidence: 'limited' as const,
          provider: 'fixture',
          model: 'fixture',
          assessment: {
            lowCents: null,
            highCents: null,
            listingCents: null,
            quickCents: null,
            explanation: 'No market evidence available',
            features: ['Confirm label material'],
            warnings: ['Preliminary estimate—limited market evidence'],
            evidence: [],
          },
        };
        current.history = [analysis];
        current.latest = analysis;
        current.inputs = body.inputs;
        return route.fulfill({ json: analysis });
      }
      current.item = { ...current.item, listingPrice: Number(body.chosenCents) / 100, _rev: 'r2' };
      return route.fulfill({ json: { message: 'Price saved to draft. Update Vinted manually.' } });
    });
    await open(page, width);
    const dialog = page.getByRole('dialog', { name: 'Price This Item', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { level: 2 })).toHaveCount(5);
    await dialog.getByLabel(/Acquisition cost \(USD\)/).fill('10.00');
    await dialog.getByLabel('Minimum desired profit (USD)', { exact: true }).fill('5.00');
    await dialog.getByLabel(/Seller percentage fee/).fill('1000');
    await dialog.getByRole('button', { name: 'Generate private assessment' }).click();
    await expect(dialog.getByRole('status')).toContainText('Analysis saved privately');
    expect(current.item.listingPrice).toBe(20);
    await dialog.getByLabel(/Chosen price \/ offer calculator/).fill('12.00');
    await expect(
      dialog.getByText('This chosen price / offer is below your profit floor.'),
    ).toBeVisible();
    await dialog.getByLabel(/Chosen price \/ offer calculator/).fill('18.00');
    await dialog.getByLabel('Packaging (USD)', { exact: true }).fill('1.00');
    const apply = dialog.getByRole('button', { name: 'Apply Price to Draft' });
    await expect(apply).toBeDisabled();
    await dialog
      .getByLabel('I reviewed the outdated recommendation against the current item and costs.')
      .check();
    await expect(apply).toBeEnabled();
    await apply.click();
    await expect(dialog.getByRole('status')).toContainText('Price saved to draft');
    expect(actions.map((a) => a.action)).toEqual(['analyze', 'apply']);
    expect(actions[1].approved).toBe(true);
    expect(actions[1].chosenCents).toBe(1800);
    expect(actions[1].reviewedOutdated).toBe(true);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(() => !!document.activeElement?.closest('[data-ui="Dialog"]')),
      ).toBeTruthy();
    }
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations.map((v) => v.id),
    ).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: `test-results/pricing-${width}.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
test('missing private pricing configuration shows setup feedback without a mock analysis', async ({
  page,
}) => {
  await page.route('**/api/studio/pricing/item', (r) =>
    r.fulfill({
      status: 503,
      json: { message: 'Pricing setup required: configure a separate PRIVATE dataset.' },
    }),
  );
  await open(page, 390);
  await expect(
    page.getByText('Pricing setup required: configure a separate PRIVATE dataset.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate private assessment' })).toHaveCount(0);
});
test('sold items allow sale records and history but disable price application', async ({
  page,
}) => {
  const current = data();
  current.item.availability = 'sold';
  current.aiReady = false;
  await page.route('**/api/studio/pricing/item', (r) => r.fulfill({ json: current }));
  await open(page, 1440);
  await expect(page.getByRole('button', { name: 'Apply Price to Draft' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Record actual sale' })).toBeVisible();
  await expect(page.getByText(/AI setup required/)).toBeVisible();
});
