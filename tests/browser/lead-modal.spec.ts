import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'esbuild';
let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {LeadModal} from './components/LeadModal'; const root=document.createElement('div'); document.body.append(root); createRoot(root).render(React.createElement(LeadModal,{content:{enabled:true}, image:React.createElement('img',{src:'/img/mirror.jpg',alt:'',width:4514,height:3009})}));`,
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
for (const width of [1440, 390]) {
  test(`lead signup, branding layout, focus and suppression at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/forms', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Check your inbox to confirm your newsletter subscription.',
        }),
      }),
    );
    await page.goto('/about');
    await page.addScriptTag({ content: fixture });
    const dialog = page.getByRole('dialog', {
      name: 'Get 15% Off your first order from my closet!',
    });
    await expect(dialog).toBeVisible();
    const copy = await dialog.locator('.lead-dialog__content').boundingBox();
    const image = await dialog.locator('.lead-dialog__image').boundingBox();
    expect(width === 1440 ? image!.x > copy!.x : image!.y > copy!.y).toBeTruthy();
    expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBeTruthy();
    for (let n = 0; n < 6; n++) {
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(() => !!document.activeElement?.closest('.lead-dialog')),
      ).toBeTruthy();
    }
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
    await dialog.getByLabel('Email address').fill('reader@example.test');
    await expect(dialog.locator('.email-control')).toHaveAttribute('data-validation', 'valid');
    await expect(dialog.locator('.email-control__tick')).toHaveCSS('opacity', '1');
    await dialog.getByRole('button', { name: 'Get my 15% off' }).click();
    await expect(dialog.getByRole('status')).toContainText('Check your inbox');
    expect(
      await page.evaluate(() => localStorage.getItem('curvygirlreviews:lead:submitted:v1')),
    ).toBe('true');
    await expect(dialog.getByRole('button', { name: 'Subscribed' })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Close exclusive offer' }).click();
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.addScriptTag({ content: fixture });
    await page.waitForTimeout(1500);
    await expect(dialog).not.toBeVisible();
  });
}
test('dismissal works and provider errors never suppress the lead prompt', async ({ page }) => {
  await page.route('**/api/forms', (route) =>
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Signup could not be accepted. Please try again.' }),
    }),
  );
  await page.goto('/about');
  await page.addScriptTag({ content: fixture });
  const dialog = page.locator('.lead-dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Email address').fill('reader@example.test');
  await dialog.getByRole('button', { name: 'Get my 15% off' }).click();
  await expect(dialog.getByRole('status')).toContainText('could not be accepted');
  expect(
    await page.evaluate(() => localStorage.getItem('curvygirlreviews:lead:submitted:v1')),
  ).toBeNull();
  await page.mouse.click(2, 2);
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await page.addScriptTag({ content: fixture });
  await page.waitForTimeout(1500);
  await expect(dialog).not.toBeVisible();
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.addScriptTag({ content: fixture });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
