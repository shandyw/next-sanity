import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Shop the Looks and Vinted destinations work on desktop and mobile', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/shop');
    await expect(page.getByRole('heading', { name: 'Shop the Looks', level: 1 })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Filter Looks by occasion' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);

    await page.goto('/shop/closet');
    await expect(page.getByRole('heading', { name: 'Shop My Closet', level: 1 })).toBeVisible();
    const vinted = page.getByRole('link', { name: /Shop My Vinted Closet/ });
    await expect(vinted).toHaveAttribute('href', /^https:\/\/(www\.)?vinted\./);
    await expect(vinted).toHaveAttribute('rel', /noopener noreferrer/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('a published Look can be opened, saved, and revisited', async ({ page }) => {
  await page.goto('/shop');
  const firstLook = page.locator('.look-card').first();
  test.skip((await firstLook.count()) === 0, 'No published Looks in this dataset.');
  const title = await firstLook.locator('h2').innerText();
  await firstLook.getByRole('button', { name: /Save item/ }).click();
  await page.goto('/wishlist');
  await expect(page.getByRole('link', { name: title })).toBeVisible();
  await page.getByRole('link', { name: title }).click();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shop this Look' })).toBeVisible();
  const amazonLinks = page.getByRole('link', { name: /View on Amazon/ });
  if (await amazonLinks.count()) {
    await expect(amazonLinks.first()).toHaveAttribute('href', /^https:\/\/(www\.)?(amazon\.com|amzn\.to)/);
    await expect(amazonLinks.first()).toHaveAttribute('rel', /noopener noreferrer/);
  }
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test('retired wishlist catalog leads to the external gift wishlist on Support', async ({ page }) => {
  await page.goto('/my-wishlist');
  await expect(page).toHaveURL(/\/support$/);
  await expect(page.getByRole('link', { name: /View My Amazon Wishlist/ })).toHaveAttribute('href', /^https:\/\//);
});

test('old product URLs are not presented as Find pages, and legacy saved IDs can be cleared', async ({ page, request }) => {
  expect((await request.get('/shop/old-product-that-does-not-exist')).status()).toBe(404);
  await page.addInitScript(() => {
    localStorage.setItem('curvygirlreviews:wishlist:v1', JSON.stringify({ version: 1, ids: ['old-product-id'] }));
  });
  await page.goto('/wishlist');
  await expect(page.getByText('1 older saved item is no longer available.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear unavailable items' }).click();
  await expect(page.getByText('1 older saved item is no longer available.')).toHaveCount(0);
});
