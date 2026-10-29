import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for (const width of [1440, 390]) {
  test(`shopping section routes, filters and support remain distinct at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/shop/closet');
    await expect(page.locator('.reviews-summary')).toContainText(/\d+ items? found/);
    await expect(
      page.locator('.archive-dropdown summary').filter({ hasText: /^Price$/ }),
    ).toHaveCount(0);
    const initialCount = Number(
      (await page.locator('.reviews-summary').innerText()).match(/\d+/)![0],
    );
    const sections = page.getByRole('navigation', { name: 'Shopping section' });
    await expect(sections.locator('img')).toHaveCount(2);
    await expect(page.getByLabel('Sort by', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clear filters' })).toHaveCount(0);
    await expect(sections.getByRole('link', { name: /My Closet/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await sections.getByRole('link', { name: /Curated Finds/ }).click();
    await expect(page).toHaveURL(/\/shop\/finds$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Curated Finds');
    await expect(page.locator('.reviews-summary')).toContainText(/\d+ items? found/);
    await expect(
      page.locator('.archive-dropdown summary').filter({ hasText: 'Condition' }),
    ).toHaveCount(0);
    await expect(
      page.locator('.archive-dropdown summary').filter({ hasText: 'Personally tried' }),
    ).toBeVisible();
    await sections.getByRole('link', { name: /My Closet/ }).click();
    await expect(page).toHaveURL(/\/shop\/closet$/);
    await expect(page.locator('.reviews-summary')).toContainText(
      new RegExp(`${initialCount} items? found`),
    );
    const category = page
      .locator('details')
      .filter({ has: page.locator('summary', { hasText: 'Category' }) });
    await category.locator('summary').click();
    const checkbox = category.locator('input[type=checkbox]').first();
    if (await checkbox.count()) {
      const categoryValue = await checkbox.getAttribute('value');
      await checkbox.check();
      await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBe(categoryValue);
      await expect(page.getByRole('link', { name: 'Clear filters' })).toBeVisible();
      const filteredSummary = await page.locator('.reviews-summary p').innerText();
      await page.reload();
      await expect(page.locator('.reviews-summary p')).toHaveText(filteredSummary);
    } else {
      // Live inventory can legitimately have no published category assignments yet.
      await expect(category.getByText('No options yet.', { exact: true })).toBeVisible();
    }
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
