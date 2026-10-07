import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
  await expect(second.locator('.review-card')).toHaveCount(1);
  const populated = await new AxeBuilder({ page: second })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(populated.violations.map((v) => v.id)).toEqual([]);
  await save.click();
  await expect(second.locator('.review-card')).toHaveCount(0);
  await save.click();
  await expect(second.locator('.review-card')).toHaveCount(1);
  await second.locator('.wishlist-action button').click();
  await expect(second.locator('.review-card')).toHaveCount(0);
  await expect(second.getByRole('heading', { name: 'Saved items' })).toBeFocused();
  await save.click();
  await second.getByRole('button', { name: 'Clear wishlist', exact: true }).click();
  await expect(second.locator('.review-card')).toHaveCount(0);
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
  await expect(page.locator('.review-card')).toHaveCount(0);
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
  await expect(page.getByText(/1 saved item is no longer/)).toBeVisible();
  await page.getByRole('button', { name: 'Clear wishlist', exact: true }).click();
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
