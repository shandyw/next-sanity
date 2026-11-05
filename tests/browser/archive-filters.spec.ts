import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [1440, 390, 320]) {
  test(`review filters remain accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/reviews');
    const form = page.locator('.archive-filter-form--catalog');
    await expect(form).toBeVisible();
    await expect(form.getByLabel('Search reviews')).toBeVisible();
    await expect(form.getByLabel('Sort by')).toBeVisible();
    await expect(form.locator('summary', { hasText: 'Format' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Clear filters' })).toHaveCount(0);
    const category = form.locator('details').filter({ has: page.locator('summary', { hasText: 'Category' }) });
    await category.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(category).toHaveAttribute('open', '');
    const firstOption = category.locator('input[type="checkbox"]').first();
    if (await firstOption.count()) {
      await firstOption.check();
      await expect(page).toHaveURL(/category=/);
      await expect(page.getByRole('link', { name: 'Clear filters' })).toBeVisible();
      await page.getByRole('link', { name: 'Clear filters' }).click();
      await expect(page).toHaveURL(/\/reviews$/);
    } else {
      await expect(category.getByText('No options yet.')).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const axe = await new AxeBuilder({ page }).include('.archive-filter-form--catalog').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(axe.violations.map((violation) => violation.id)).toEqual([]);
  });
}

test('review search preserves URL state and clear filters resets it', async ({ page }) => {
  await page.goto('/reviews');
  await page.locator('#archiveSearch').fill('jeans');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/reviews\?q=jeans/);
  await expect(page.locator('#archiveSearch')).toHaveValue('jeans');
  await page.getByRole('link', { name: 'Clear filters' }).click();
  await expect(page).toHaveURL(/\/reviews$/);
  await expect(page.locator('#archiveSearch')).toHaveValue('');
});

test('review search keeps scroll and focus through client navigation and browser history', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/reviews');
  const search = page.locator('#archiveSearch');
  await search.scrollIntoViewIfNeeded();
  await search.focus();
  const before = await page.evaluate(() => scrollY);
  await search.fill('a-review-that-does-not-exist');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/q=a-review-that-does-not-exist/);
  await expect(search).toHaveValue('a-review-that-does-not-exist');
  expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThan(30);
  await page.goBack();
  await expect(page).toHaveURL(/\/reviews$/);
  await expect(search).toHaveValue('');
  await page.goForward();
  await expect(search).toHaveValue('a-review-that-does-not-exist');
  const category = page.locator('.archive-filter-form--catalog details').first();
  await category.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(category).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(category.locator('summary')).toBeFocused();
});
