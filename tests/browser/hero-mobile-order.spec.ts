import { expect, test } from '@playwright/test';

for (const width of [320, 390]) {
  test(`hero image appears before copy at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });

    for (const route of ['/', '/reviews', '/shop/closet', '/shop/finds', '/about']) {
      await page.goto(route);
      const hero = page.locator('.editorial-hero');
      await expect(hero).toHaveCount(1);
      const image = await hero.locator('.editorial-hero__inner > :last-child').boundingBox();
      const copy = await hero.locator('.editorial-hero__copy').boundingBox();
      expect(image!.y + image!.height, route).toBeLessThanOrEqual(copy!.y);
    }
  });
}

test('desktop hero keeps copy beside image', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/shop/closet');
  const hero = page.locator('.editorial-hero');
  const image = await hero.locator('.editorial-hero__inner > :last-child').boundingBox();
  const copy = await hero.locator('.editorial-hero__copy').boundingBox();
  expect(copy!.x + copy!.width).toBeLessThanOrEqual(image!.x);
});
