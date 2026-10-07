import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [1440, 390]) {
  test(`product images open item details and hearts remain independent at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/shop');
    const card = page.locator('.review-card').first();
    const image = card.locator('.review-card__media-link');
    const href = await image.getAttribute('href');
    const title = await card.locator('h2').innerText();
    await card.getByRole('button', { name: /Save .* to wishlist/ }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await image.click();
    await expect(page).toHaveURL(href!);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByRole('heading', { name: 'Item details' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
    await page.goto('/wishlist');
    await page.locator('.review-card__media-link').click();
    await expect(page).toHaveURL(href!);
  });
}

test('unknown item slugs return 404', async ({ page }) => {
  const response = await page.goto('/shop/missing-item-slug');
  expect(response?.status()).toBe(404);
});
