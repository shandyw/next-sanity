import { expect, test } from '@playwright/test';

test('body page class follows the URL and client-side navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/\bpage-home\b/);

  await page.evaluate(() => history.pushState(null, '', '/reviews/example-review'));
  await expect(page.locator('body')).toHaveClass(/\bpage-reviews-example-review\b/);
  await expect(page.locator('body')).not.toHaveClass(/\bpage-home\b/);

  await page.evaluate(() => history.pushState(null, '', '/shop/closet'));
  await expect(page.locator('body')).toHaveClass(/\bpage-shop-closet\b/);
  await expect(page.locator('body')).not.toHaveClass(/\bpage-reviews-example-review\b/);
});
