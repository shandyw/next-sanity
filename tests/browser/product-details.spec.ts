import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [1440, 390]) {
  test(`product images open item details and hearts remain independent at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/shop');
    const card = page.locator('.review-card').first();
    const image = card.locator('.review-card__media-link').first();
    const media = card.locator('.review-card__media');
    const bounds = await media.boundingBox();
    expect(bounds!.width / bounds!.height).toBeCloseTo(4 / 5, 2);
    await expect(media.locator('img').first()).toHaveAttribute('width', '1080');
    await expect(media.locator('img').first()).toHaveAttribute('height', '1350');
    const href = await image.getAttribute('href');
    const title = await card.locator('h2').innerText();
    await expect(card).not.toContainText('Listing price:');
    await expect(card).not.toContainText(/closet link coming soon/);
    await expect(card.getByRole('link', { name: 'Learn More', exact: true })).toHaveAttribute(
      'href',
      href!,
    );
    await card.getByRole('button', { name: /Save .* to wishlist/ }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await image.click();
    await expect(page).toHaveURL(href!);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByRole('heading', { name: 'Item details' })).toBeVisible();
    const detail = page.locator('.product-detail .review-detail__main-image').first();
    await expect(detail).toHaveAttribute('width', '1080');
    await expect(detail).toHaveAttribute('height', '1350');
    if (href?.includes('local-sample-product')) {
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    } else {
      await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
    await page.goto('/wishlist');
    await expect(page.getByRole('columnheader', { name: 'Shop', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Price', exact: true })).toHaveCount(0);
    await page.locator('.wishlist-item__image a').click();
    await expect(page).toHaveURL(href!);
  });
}

test('unknown item slugs return 404', async ({ page }) => {
  const response = await page.goto('/shop/missing-item-slug');
  expect(response?.status()).toBe(404);
});
