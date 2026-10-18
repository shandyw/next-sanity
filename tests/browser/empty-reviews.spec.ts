import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [1440, 390, 320]) {
  test(`illustrated empty review search at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/reviews?q=no-match-for-this-query&brand=no-matching-brand');
    await expect(page.getByRole('heading', { name: 'Nothing fits this search.' })).toBeVisible();
    await expect(page.locator('.reviews-empty__image')).toBeVisible();
    await expect(page.locator('.reviews-summary')).toContainText('0 reviews found');
    await expect
      .poll(() =>
        page
          .locator('.editorial-hero')
          .evaluate((element) => element.getAnimations({ subtree: true }).length),
      )
      .toBe(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
    await page.screenshot({ path: `test-results/empty-reviews-${width}.png`, fullPage: true });
    const trigger = page.locator('.reviews-empty__request');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Request a review', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await page.getByRole('link', { name: 'Clear search & filters', exact: true }).click();
    await expect(page).toHaveURL(/\/reviews$/);
    await expect(page.locator('#archiveSearch')).toHaveValue('');
    await page.goBack();
    await expect(page.locator('#archiveSearch')).toHaveValue('no-match-for-this-query');
    await expect(page.getByRole('heading', { name: 'Nothing fits this search.' })).toBeVisible();
  });
}
