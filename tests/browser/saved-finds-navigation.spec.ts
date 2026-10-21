import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [1440, 390]) {
  test(`saved finds shortcut and footer socials at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/shop');
    if (width < 1024) await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.locator('.saved-finds')).toHaveAttribute('href', '/wishlist');
    await expect(page.locator('.saved-finds__count')).toHaveCount(0);
    if (width < 1024) await expect(page.locator('.social-links--mobile-nav')).toBeVisible();
    else await expect(page.locator('.social-links--mobile-nav')).toBeHidden();
    await expect(page.locator('.footer-base__links a[href="/wishlist"]')).toHaveCount(1);
    if (width < 1024) await expect(page.locator('.social-tab')).toBeHidden();
    else await expect(page.locator('.social-tab')).toBeVisible();
    await expect(page.locator('.site-footer .social-links')).toHaveCount(1);
    if (width < 1024) await page.getByRole('button', { name: 'Close menu' }).click();
    const save = page.locator('.review-card .wishlist-action button').first();
    await save.click();
    if (width < 1024) await page.getByRole('button', { name: 'Open menu' }).click();
    const shortcut = page.getByRole('link', { name: 'Saved Items: 1 saved item', exact: true });
    await expect(shortcut).toBeVisible();
    await expect(shortcut.locator('.saved-finds__count')).toHaveText('1');
    await shortcut.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/wishlist$/);
    await expect(page.locator('.wishlist-row')).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const second = await context.newPage();
    await second.goto('/wishlist');
    await second.getByRole('button', { name: 'Clear saved items', exact: true }).click();
    await expect(page.locator('.saved-finds')).toHaveAttribute('href', '/wishlist');
    await expect(page.locator('.saved-finds__count')).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
  });
}

test('bookmark shows the exact count and handles blocked storage', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'curvygirlreviews:wishlist:v1',
      JSON.stringify({ version: 1, ids: ['a', 'b', 'c'] }),
    ),
  );
  await page.goto('/support');
  await expect(page.locator('.saved-finds__count')).toHaveText('3');
  await expect(page.locator('.saved-finds')).toHaveAttribute('href', '/wishlist');
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    }),
  );
  await page.reload();
  await expect(page.locator('.saved-finds')).toHaveAttribute('href', '/wishlist');
  await expect(page.locator('.saved-finds__count')).toHaveCount(0);
});

for (const width of [1440, 390]) {
  test(`empty header heart opens wishlist with keyboard at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    if (width < 1024) await page.getByRole('button', { name: 'Open menu' }).click();
    const heart = page.getByRole('link', { name: 'Saved Items: 0 saved items', exact: true });
    await expect(heart).toBeVisible();
    await expect(heart.locator('.saved-finds__count')).toHaveCount(0);
    await heart.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/wishlist$/);
    await expect(page.locator('.wishlist-empty')).toBeVisible();
  });
}
