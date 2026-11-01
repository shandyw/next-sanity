import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage Looks keep the intended card width and navigation at each breakpoint', async ({
  page,
}) => {
  for (const [width, capacity] of [
    [1440, 3],
    [900, 2],
    [390, 1],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const section = page.locator('.home-looks');
    const featured = section.locator('.home-featured-look');
    if (await featured.count()) {
      await expect(section.getByText('Shop the Look', { exact: true })).toBeVisible();
      await expect(featured.getByRole('heading', { level: 2 })).toBeVisible();
      await expect(featured.getByRole('link', { name: /Shop This Look/ })).toHaveAttribute(
        'href',
        /^\/looks\//,
      );
      await expect(featured.getByRole('link', { name: /^View / })).toHaveAttribute(
        'href',
        /^\/looks\//,
      );
      await expect(section.locator('.home-look-carousel__controls')).toHaveCount(0);
      const image = featured.locator(
        '.home-featured-look__image img, .home-featured-look__image .image-placeholder',
      );
      const imageBox = await image.boundingBox();
      const copyBox = await featured.locator('.home-featured-look__copy').boundingBox();
      expect(imageBox).not.toBeNull();
      expect(copyBox).not.toBeNull();
      expect(imageBox!.width / imageBox!.height).toBeCloseTo(6 / 5, 2);
      if (width >= 900) expect(imageBox!.x + imageBox!.width).toBeLessThan(copyBox!.x);
      else expect(imageBox!.y + imageBox!.height).toBeLessThan(copyBox!.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const accessibility = await new AxeBuilder({ page })
        .include('.home-looks')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(accessibility.violations.map((violation) => violation.id)).toEqual([]);
      const title = await featured.getByRole('heading', { level: 2 }).innerText();
      await featured.getByRole('link', { name: /Shop This Look/ }).click();
      await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
      continue;
    }

    await expect(section.getByText('Outfits for wherever life takes you.')).toBeVisible();
    await expect(section.getByRole('link', { name: 'Browse all Looks →' })).toHaveAttribute(
      'href',
      '/shop',
    );
    const slides = section.locator('.home-look-carousel__slide');
    const count = await slides.count();
    const next = section.getByRole('button', { name: 'Next Look' });
    const previous = section.getByRole('button', { name: 'Previous Look' });

    if (!count) {
      await expect(section.getByText('Outfit stories are coming soon.')).toBeVisible();
      await expect(next).toHaveCount(0);
      continue;
    }

    const track = section.locator('.home-look-carousel__track');
    const geometry = await track.evaluate((element) => {
      const card = element.firstElementChild as HTMLElement;
      return { width: element.clientWidth, card: card.offsetWidth, scroll: element.scrollWidth };
    });
    expect(geometry.card / geometry.width).toBeCloseTo(1 / capacity, 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(slides.first().getByRole('link', { name: /^View / })).toHaveAttribute(
      'href',
      /^\/looks\//,
    );
    const image = slides.first().locator('img, .image-placeholder').first();
    const ratio = await image.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return width / height;
    });
    expect(ratio).toBeCloseTo(3 / 4, 2);

    if (count > capacity) {
      await expect(next).toBeVisible();
      await expect(previous).toBeDisabled();
      await next.focus();
      await page.keyboard.press('Enter');
      await expect(previous).toBeEnabled();
      await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    } else {
      await expect(next).toHaveCount(0);
      await expect(previous).toHaveCount(0);
    }

    const accessibility = await new AxeBuilder({ page })
      .include('.home-looks')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(accessibility.violations.map((violation) => violation.id)).toEqual([]);
  }
});
