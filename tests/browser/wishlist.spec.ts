import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('empty wishlist uses the illustration, hero disclaimer and keyboard closet link', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/wishlist');
  await expect(page.locator('.wishlist-empty__image')).toBeVisible();
  await expect(page.locator('.editorial-hero__disclaimer')).toContainText(
    'Saved in this browser only.',
  );
  await expect(
    page.getByRole('heading', { name: 'Your next favorite is out there.' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear saved items', exact: true })).toBeHidden();
  const link = page.getByRole('link', { name: 'Browse My Closet' });
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/shop\/closet$/);
});

test('empty wishlist can clear unavailable saved IDs and reports a failed storage write', async ({
  page,
}) => {
  await page.goto('/wishlist');
  await expect(page.getByRole('button', { name: 'Clear unavailable items' })).toBeHidden();
  await page.evaluate(() =>
    localStorage.setItem(
      'curvygirlreviews:wishlist:v1',
      JSON.stringify({ version: 1, ids: ['missing-a', 'missing-b'] }),
    ),
  );
  await page.reload();
  const clear = page.getByRole('button', { name: 'Clear unavailable items' });
  await expect(clear).toBeVisible();
  await page.evaluate(() => {
    Storage.prototype.removeItem = () => {
      throw new Error('blocked');
    };
  });
  await clear.click();
  await expect(page.getByRole('status')).toContainText('could not clear these items');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('curvygirlreviews:wishlist:v1')!).ids,
    ),
  ).toHaveLength(2);
  await page.reload();
  await clear.focus();
  await page.keyboard.press('Enter');
  await expect(clear).toBeHidden();
  await expect(page.locator('.saved-finds')).toHaveAttribute('href', '/wishlist');
  await expect(page.locator('#wishlist-heading')).toBeFocused();
  expect(
    await page.evaluate(() => localStorage.getItem('curvygirlreviews:wishlist:v1')),
  ).toBeNull();
  await expect(page.getByRole('status')).toContainText('Unavailable saved items cleared.');
});

test('wishlist persists, synchronizes tabs, removes products, and clears without an account', async ({
  page,
  context,
}) => {
  await page.goto('/shop');
  const save = page.locator('.review-card .wishlist-action button').first();
  await expect(save).toBeEnabled();
  await save.focus();
  await page.keyboard.press('Space');
  await expect(save).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(save).toHaveAttribute('aria-pressed', 'true');
  const second = await context.newPage();
  await second.goto('/wishlist');
  await expect(second.locator('.wishlist-row')).toHaveCount(1);
  const populated = await new AxeBuilder({ page: second })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(populated.violations.map((v) => v.id)).toEqual([]);
  await save.click();
  await expect(second.locator('.wishlist-row')).toHaveCount(0);
  await save.click();
  await expect(second.locator('.wishlist-row')).toHaveCount(1);
  await second.locator('.wishlist-remove').click();
  await expect(second.locator('.wishlist-row')).toHaveCount(0);
  await expect(second.locator('#wishlist-heading')).toBeFocused();
  await save.click();
  await second.getByRole('button', { name: 'Clear saved items', exact: true }).click();
  await expect(second.locator('.wishlist-row')).toHaveCount(0);
  await expect(save).toHaveAttribute('aria-pressed', 'false');
  await second.setViewportSize({ width: 390, height: 844 });
  await expect(second.locator('#primaryNav')).toBeHidden();
  expect(
    await second.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  const result = await new AxeBuilder({ page: second })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
});

test('corrupt and blocked browser storage have honest fallback states', async ({ page }) => {
  await page.goto('/wishlist');
  await page.evaluate(() => localStorage.setItem('curvygirlreviews:wishlist:v1', 'broken'));
  await page.reload();
  await expect(page.locator('.wishlist-row')).toHaveCount(0);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  await page.goto('/shop');
  await expect(page.locator('.wishlist-action button').first()).toBeDisabled();
  await expect(page.locator('.wishlist-action').first()).toContainText('allow browser storage');
  await page.goto('/wishlist');
  await expect(page.getByRole('status').filter({ hasText: 'blocks site storage' })).toBeVisible();
});

test('failed writes do not report a save and missing products retain their saved IDs', async ({
  page,
}) => {
  await page.goto('/wishlist');
  await page.evaluate(() =>
    localStorage.setItem(
      'curvygirlreviews:wishlist:v1',
      JSON.stringify({ version: 1, ids: ['no-longer-listed'] }),
    ),
  );
  await page.reload();
  await expect(page.getByText(/1 previously saved piece is currently unavailable/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear saved items', exact: true })).toBeHidden();
  await page.goto('/shop');
  const save = page.locator('.wishlist-action button').first();
  await expect(save).toBeEnabled();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('quota');
    };
  });
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.wishlist-action').first()).toContainText(
    'could not save this change',
  );
});
