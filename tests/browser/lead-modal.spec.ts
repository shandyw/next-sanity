import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'esbuild';

let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {LeadModal} from './components/LeadModal'; createRoot(document.getElementById('root')).render(React.createElement(LeadModal,{content:{enabled:true},image:React.createElement('img',{src:'/img/mirror.jpg',alt:''})}));`,
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    define: { 'process.env': '{}' },
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
  });
  fixture = result.outputFiles[0].text;
});
async function setup(page: import('@playwright/test').Page, width: number) {
  await page.clock.install({ time: new Date('2026-11-11T12:00:00Z') });
  await page.setViewportSize({ width, height: 800 });
  await page.route('**/lead-modal-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body><button data-open-lead>Get updates</button><div style="height:2400px"></div><div id="root"></div></body></html>',
    }),
  );
  await page.goto('/lead-modal-fixture');
  await page.addScriptTag({ content: fixture });
  await expect(page.locator('.lead-dialog')).toHaveCount(1);
}

for (const width of [1440, 390]) {
  test(`manual signup, keyboard focus, and API-confirmed suppression at ${width}px`, async ({
    page,
  }) => {
    await setup(page, width);
    await page.route('**/api/forms', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Check your inbox to confirm your newsletter subscription.',
        }),
      }),
    );
    await page.getByRole('button', { name: 'Get updates' }).click();
    const dialog = page.getByRole('dialog', {
      name: 'Get 15% Off your first order from my closet!',
    });
    await expect(dialog).toBeVisible();
    for (let n = 0; n < 4; n++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('.lead-dialog'))).toBe(
        true,
      );
    }
    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(accessibility.violations.map((v) => v.id)).toEqual([]);
    await dialog.getByLabel('Email address').fill('reader@example.test');
    await dialog.getByRole('button', { name: 'Get my 15% off' }).click();
    await expect(dialog.getByRole('status')).toContainText('Check your inbox');
    await expect(dialog.getByRole('button', { name: 'Subscribed' })).toBeDisabled();
    expect(
      await page.evaluate(() => localStorage.getItem('curvygirlreviews:lead:submitted:v1')),
    ).toBe('true');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Get updates' })).toBeFocused();
    await page.evaluate(() => scrollTo(0, 1000));
    await page.clock.fastForward(30_000);
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.lead-banner')).not.toBeVisible();
  });
}

test('provider error does not mark visitor subscribed, and closing starts cooldown', async ({
  page,
}) => {
  await setup(page, 1440);
  await page.route('**/api/forms', (route) =>
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Signup could not be accepted. Please try again.' }),
    }),
  );
  await page.getByRole('button', { name: 'Get updates' }).click();
  const dialog = page.locator('.lead-dialog');
  await dialog.getByLabel('Email address').fill('reader@example.test');
  await dialog.getByRole('button', { name: 'Get my 15% off' }).click();
  await expect(dialog.getByRole('status')).toContainText('could not be accepted');
  expect(
    await page.evaluate(() => localStorage.getItem('curvygirlreviews:lead:submitted:v1')),
  ).toBeNull();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => Number(localStorage.getItem('curvygirlreviews:lead:dismissed:v2'))),
    )
    .toBeGreaterThan(0);
  await page.clock.fastForward(30_000);
  await page.evaluate(() => scrollTo(0, 1000));
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Get updates' }).click();
  await expect(dialog).toBeVisible();
});

test('Maybe later closes the signup dialog and starts the dismissal cooldown', async ({ page }) => {
  await setup(page, 1440);
  await page.getByRole('button', { name: 'Get updates' }).click();
  const dialog = page.getByRole('dialog', { name: 'Get 15% Off your first order from my closet!' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Maybe later' }).click();
  await expect(dialog).not.toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => Number(localStorage.getItem('curvygirlreviews:lead:dismissed:v2'))),
    )
    .toBeGreaterThan(0);
});
