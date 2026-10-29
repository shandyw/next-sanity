import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

function poolPath(src: string) {
  const url = new URL(src, 'http://localhost:3000');
  return url.searchParams.get('url') || url.pathname;
}

for (const width of [1440, 390, 320]) {
  test(`shared hero across public pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [route, title] of [
      ['/reviews', 'Fashion Reviews'],
      ['/shop/closet', 'My Closet'],
      ['/shop/finds', 'Curated Finds'],
      ['/blog', 'The Blog'],
      ['/wishlist', 'Wishlist'],
      ['/support', 'Support the Reviews'],
      ['/about', 'About CurvyGirlReviews'],
      ['/privacy', 'Privacy Policy'],
      ['/thank-you', 'Thank You!'],
    ]) {
      await page.goto(route);
      const hero = page.locator('.editorial-hero');
      await expect(hero).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(hero.getByRole('heading', { level: 1 })).toHaveText(title);
      const images = hero.locator('.editorial-hero__photo img');
      await expect(images).toHaveCount(2);
      await expect(hero.locator('.editorial-hero__measure')).toHaveCount(0);
      await expect(hero.locator('.editorial-hero__photo--small')).toHaveCSS('z-index', '2');
      const bounds = await hero.boundingBox();
      for (const frame of await hero.locator('.editorial-hero__photo').all()) {
        await expect(frame).toHaveCSS('padding', '7px');
        await expect(frame).toHaveCSS('background-color', 'rgb(255, 253, 250)');
        const photo = await frame.boundingBox();
        expect(photo!.x, route).toBeGreaterThanOrEqual(bounds!.x);
        expect(photo!.x + photo!.width, route).toBeLessThanOrEqual(bounds!.x + bounds!.width);
      }
      const paths = await images.evaluateAll((elements) =>
        elements.map((image) => image.getAttribute('src')!),
      );
      expect(new Set(paths.map(poolPath)).size).toBe(2);
      expect(paths.map(poolPath).every((path) => path.startsWith('/img/hero/'))).toBe(true);
      await expect(hero.locator('.editorial-hero__label, .editorial-hero__paper')).toHaveCount(0);
      for (const photo of await hero.locator('.editorial-hero__photo').all()) {
        expect(await photo.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        route,
      ).toBeTruthy();
      const axe = await new AxeBuilder({ page })
        .include('.editorial-hero')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        axe.violations.map((violation) => violation.id),
        route,
      ).toEqual([]);
      if (route === '/wishlist') {
        await expect(hero.locator('.editorial-hero__disclaimer')).toContainText(
          'Saved in this browser only.',
        );
        await page.screenshot({ path: `test-results/shared-hero-wishlist-${width}.png` });
      }
    }
  });
}

test('filters preserve hero photos and do not replay its entrance', async ({ page }) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.closest('.editorial-hero')) {
        document.documentElement.dataset.heroAnimations = String(
          Number(document.documentElement.dataset.heroAnimations || 0) + 1,
        );
      }
      return animate.call(this, frames, options);
    };
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/reviews');
  const hero = page.locator('.editorial-hero');
  await expect.poll(() => page.locator('html').getAttribute('data-hero-animations')).toBe('5');
  const photos = await hero
    .locator('img')
    .evaluateAll((images) => images.map((image) => image.getAttribute('src')));
  await page.locator('#archiveSearch').fill('no-match-shared-hero-check');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/q=no-match-shared-hero-check/);
  await expect(page.getByRole('heading', { name: 'Nothing fits this search.' })).toBeVisible();
  expect(
    await hero
      .locator('img')
      .evaluateAll((images) => images.map((image) => image.getAttribute('src'))),
  ).toEqual(photos);
  expect(await page.locator('html').getAttribute('data-hero-animations')).toBe('5');
});
