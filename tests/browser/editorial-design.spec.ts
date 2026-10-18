import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

function contrast(foreground: string, background: string) {
  const luminance = (color: string) => {
    const channels = color
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number)
      .map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(foreground),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

for (const width of [1440, 768, 390, 320]) {
  test(`editorial homepage layout, labels, keyboard and contrast at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.editorial-hero h1')).toContainText('Big opinions,');
    await expect(page.locator('.editorial-hero__accent-text')).toHaveText('questionable');
    await expect(page.locator('.editorial-hero__ending')).toHaveText('sizing.');
    await expect(
      page.locator('.editorial-hero__tape, .doodle, .hand-note, .tape-corner'),
    ).toHaveCount(0);
    if (width < 1024) await expect(page.locator('.social-tab')).toBeHidden();
    else await expect(page.locator('.social-tab')).toBeVisible();
    await expect(page.locator('.site-footer .social-links')).toHaveCount(1);
    await expect(page.locator('.site-header .wordmark__icon')).toHaveAttribute(
      'src',
      '/img/curvy.png',
    );
    const cards = page.locator('#trending .review-card');
    if (await cards.count()) {
      expect(await cards.count()).toBeLessThanOrEqual(3);
      await expect(page.locator('.latest-empty')).toHaveCount(0);
    } else {
      await expect(page.locator('.latest-empty')).toContainText('Real try-ons are on their way.');
      await expect(page.locator('.latest-empty')).toContainText(
        'Honest fit notes. No sugarcoating.',
      );
    }
    await expect(page.locator('.home-search__label, .filters-band')).toHaveCount(0);
    await expect(page.locator('.review-checklist')).toContainText('On my review checklist');
    await expect(page.locator('#meet-shannequin')).toBeVisible();
    await expect(page.locator('#meet-shannequin a')).toHaveAttribute('href', '/about#shannequin');
    await expect(page.locator('.site-footer .newsletter-field label')).toBeVisible();
    const cta = page.getByRole('link', { name: 'Explore the Reviews', exact: true });
    for (const state of ['rest', 'hover', 'focus', 'active']) {
      if (state === 'hover') await cta.hover();
      if (state === 'focus') await cta.focus();
      if (state === 'active') {
        await cta.hover();
        await page.mouse.down();
      }
      const pair = await cta.evaluate((element) => ({
        color: getComputedStyle(element).color,
        background: getComputedStyle(element).backgroundColor,
      }));
      expect(pair).toEqual({ color: 'rgb(255, 255, 255)', background: 'rgb(125, 47, 80)' });
      expect(contrast(pair.color, pair.background)).toBeGreaterThanOrEqual(4.5);
      if (state === 'active') {
        await page.mouse.move(0, 0);
        await page.mouse.up();
      }
    }
    const input = page.locator('.site-footer input[type=email]');
    const field = await input.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        border: style.borderTopColor,
        placeholder: getComputedStyle(element, '::placeholder').color,
      };
    });
    expect(field.border).toBe('rgb(118, 112, 118)');
    expect(field.placeholder).toBe('rgb(75, 67, 72)');
    expect(contrast(field.placeholder, field.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(field.border, field.background)).toBeGreaterThanOrEqual(3);
    const link = page.locator('.about__link');
    const linkColor = await link.evaluate((element) => getComputedStyle(element).color);
    expect(linkColor).toBe('rgb(125, 47, 80)');
    expect(contrast(linkColor, 'rgb(255, 251, 248)')).toBeGreaterThanOrEqual(4.5);
    await expect(page.locator('.editorial-hero__highlight')).toHaveCount(0);
    await expect(page.locator('.editorial-hero__emphasis')).toHaveCSS('color', 'rgb(122, 35, 69)');
    await cta.focus();
    expect(await cta.evaluate((element) => getComputedStyle(element).outlineColor)).toBe(
      'rgb(33, 26, 29)',
    );
    const main = await page
      .locator('.editorial-hero__photo--main')
      .evaluate((element) => getComputedStyle(element).transform);
    expect(main).toBe('none');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      axe.violations.map((violation) => ({
        id: violation.id,
        targets: violation.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
    await page.screenshot({ path: `test-results/editorial-home-${width}.png`, fullPage: true });
    await cta.click();
    await expect(page).toHaveURL(/\/reviews$/);
    await page.locator('#archiveSearch').fill('editorial-no-match');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/\/reviews\?q=editorial-no-match/);
    await expect(page.locator('#archiveSearch')).toHaveValue('editorial-no-match');
  });
}

test('shared pink states, form validation and clean support controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/shop');
  const section = page.locator('.shopping-sections a[aria-current="page"]');
  const pair = await section.evaluate((element) => ({
    color: getComputedStyle(element).color,
    background: getComputedStyle(element).backgroundColor,
  }));
  expect(pair.background).toBe('rgb(125, 47, 80)');
  expect(contrast(pair.color, pair.background)).toBeGreaterThanOrEqual(4.5);
  await page.goto('/support');
  await expect(
    page.locator(
      '.support-choice__tape, .support-choice__bubble, .support-choice__gift, .support-burst',
    ),
  ).toHaveCount(0);
  for (const panel of await page.locator('.support-choice').all()) {
    expect(await panel.evaluate((element) => getComputedStyle(element, '::before').maskImage)).toBe(
      'none',
    );
  }
  const email = page.locator('.site-footer input[type=email]');
  await email.fill('invalid');
  const invalid = await email.evaluate((element) => ({
    border: getComputedStyle(element).borderTopColor,
    background: getComputedStyle(element).backgroundColor,
  }));
  expect(contrast(invalid.border, invalid.background)).toBeGreaterThanOrEqual(3);
  await email.fill('reader@example.test');
  const tick = await page
    .locator('.site-footer .email-control__tick')
    .evaluate((element) => getComputedStyle(element).color);
  expect(contrast(tick, 'rgb(255, 255, 255)')).toBeGreaterThanOrEqual(3);
  await page.getByRole('button', { name: 'Request a Review', exact: true }).first().focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Request a review', exact: true });
  await expect(dialog).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(axe.violations.map((violation) => violation.id)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Request a Review', exact: true }).first(),
  ).toBeFocused();
});
