import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for (const width of [1440, 1024, 1023, 390, 320]) {
  test(`social profiles follow the menu breakpoint at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/about');
    const tab = page.locator('.social-tab');
    const mobile = page.locator('.social-links--mobile-nav');
    const destinations = await tab
      .locator('a')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(destinations.length).toBeGreaterThan(0);
    expect(
      await mobile
        .locator('a')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
    ).toEqual(destinations);
    if (width < 1024) {
      await expect(tab).toBeHidden();
      await expect(mobile).toBeHidden();
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await expect(mobile).toBeVisible();
      const actions = (await page.locator('.nav-actions').boundingBox())!;
      const socials = (await mobile.boundingBox())!;
      expect(socials.y).toBeGreaterThanOrEqual(actions.y + actions.height);
      const cta = page.locator('#primaryNav button[data-open-dialog]');
      await cta.focus();
      await page.keyboard.press('Tab');
      await expect(mobile.locator('a').first()).toBeFocused();
      await expect(mobile.locator('a').first()).toHaveAccessibleName(/CurvyGirlReviews on/);
      const result = await new AxeBuilder({ page })
        .include('.site-header')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(result.violations.map((v) => v.id)).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(mobile).toBeHidden();
      await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused();
    } else {
      await expect(tab).toBeVisible();
      await expect(mobile).toBeHidden();
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
  });
}
