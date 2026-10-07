import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for (const width of [1440, 390]) {
  test(`shopping section routes, filters and support remain distinct at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/shop');
    await expect(page.locator('.reviews-summary')).toContainText('16 items found');
    const sections = page.getByRole('navigation', { name: 'Shopping section' });
    await expect(sections.getByRole('link', { name: /My Vinted Closet/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await sections.getByRole('link', { name: /Curated Finds/ }).click();
    await expect(page).toHaveURL(/\/shop\/finds$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Curated Finds');
    await expect(page.locator('.reviews-summary')).toContainText('0 items found');
    await expect(
      page.locator('.archive-dropdown summary').filter({ hasText: 'Condition' }),
    ).toHaveCount(0);
    await expect(
      page.locator('.archive-dropdown summary').filter({ hasText: 'Personally tried' }),
    ).toBeVisible();
    await sections.getByRole('link', { name: /My Vinted Closet/ }).click();
    await expect(page).toHaveURL(/\/shop\/closet$/);
    await expect(page.locator('.reviews-summary')).toContainText('16 items found');
    const category = page
      .locator('details')
      .filter({ has: page.locator('summary', { hasText: 'Category' }) });
    await category.locator('summary').click();
    await category.getByLabel('Jeans', { exact: true }).check();
    await expect(page).toHaveURL(/\/shop\/closet\?.*category=jeans/);
    await expect(page.locator('.reviews-summary')).toContainText('2 items found');
    await page.reload();
    await expect(page.locator('.reviews-summary')).toContainText('2 items found');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    if (width === 390) await expect(page.locator('#primaryNav')).toBeHidden();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
    await page.goto('/support');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Support the Reviews');
    await expect(page.locator('.shopping-sections')).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
  });
}
