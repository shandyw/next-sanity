import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

let fixture: string;
test.beforeAll(async () => {
  const bundle = await build({
    stdin: {
      contents: `import React from 'react'; import { createRoot } from 'react-dom/client'; import { AmazonClickTracking } from './components/AmazonClickTracking'; createRoot(document.getElementById('fixture')).render(<AmazonClickTracking enabled />);`,
      loader: 'tsx',
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
  });
  fixture = bundle.outputFiles[0].text;
});

test('Amazon outbound events require consent and respect Global Privacy Control', async ({ page }) => {
  await page.route('**/amazon-tracking-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<html lang="en"><body><div id="fixture"></div><a id="amazon" data-amazon-product="B0ABC12345" data-placement="review" data-experience="tested" href="https://www.amazon.com/dp/B0ABC12345">Amazon</a><a id="other" data-amazon-product="B0ABC12345" href="https://example.com">Other</a></body></html>`,
    }),
  );
  await page.goto('/amazon-tracking-fixture');
  await page.evaluate(() => {
    (window as Window & { outbound?: unknown[] }).outbound = [];
    window.addEventListener('cgr:amazon-outbound', (event) =>
      (window as Window & { outbound?: unknown[] }).outbound?.push((event as CustomEvent).detail),
    );
    document.addEventListener('click', (event) => {
      if ((event.target as Element).closest('a')) event.preventDefault();
    });
  });
  await page.addScriptTag({ content: fixture });
  await page.locator('#amazon').click();
  await expect.poll(() => page.evaluate(() => (window as Window & { outbound?: unknown[] }).outbound?.length)).toBe(0);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('cgr:analytics-consent', { detail: { granted: true } })));
  await page.locator('#other').click();
  await page.locator('#amazon').click();
  await expect.poll(() => page.evaluate(() => (window as Window & { outbound?: unknown[] }).outbound?.length)).toBe(1);
  expect(await page.evaluate(() => (window as Window & { outbound?: unknown[] }).outbound?.[0])).toEqual({
    productId: 'B0ABC12345',
    sourcePage: '/amazon-tracking-fixture',
    placement: 'review',
    experience: 'tested',
  });
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
  });
  await page.locator('#amazon').click();
  await expect.poll(() => page.evaluate(() => (window as Window & { outbound?: unknown[] }).outbound?.length)).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: false, configurable: true });
    window.dispatchEvent(new CustomEvent('cgr:analytics-consent', { detail: { granted: false } }));
  });
  await page.locator('#amazon').click();
  await expect.poll(() => page.evaluate(() => (window as Window & { outbound?: unknown[] }).outbound?.length)).toBe(1);
});
