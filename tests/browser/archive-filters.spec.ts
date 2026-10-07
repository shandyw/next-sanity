import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Run against development with demo enabled and an empty Sanity closet.
for (const width of [1440, 390]) {
  test(`shop dropdown states and keyboard access at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/shop');
    await expect(page.locator('.reviews-summary')).toContainText('16 items found');
    await expect(page.getByRole('link', { name: 'Clear search/filters' })).toHaveCount(0);
    const category = page
      .locator('details')
      .filter({ has: page.locator('summary', { hasText: 'Category' }) });
    await category.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(category).toHaveAttribute('open', '');
    await category.getByLabel('Jeans', { exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(category).not.toHaveAttribute('open', '');
    await expect(category.locator('summary')).toBeFocused();
    await category.locator('summary').click();
    await category.getByLabel('Jeans', { exact: true }).check();
    await expect(page).toHaveURL(/category=jeans/);
    await expect(page.locator('.reviews-summary')).toContainText('2 items found');
    await expect(page.locator('.reviews-search')).not.toHaveClass(/is-active/);
    await expect(category).toHaveClass(/is-active/);
    await page.reload();
    await expect(category).toHaveClass(/is-active/);
    await category.locator('summary').click();
    await category.getByLabel('Jeans', { exact: true }).uncheck();
    await expect(category).not.toHaveClass(/is-active/);
    await expect(page.locator('.reviews-search')).not.toHaveClass(/is-active/);
    await expect(category).toHaveAttribute('open', '');
    await expect(category).not.toHaveClass(/is-active/);
    await category.getByLabel('Jeans', { exact: true }).check();
    await expect(category).toHaveClass(/is-active/);
    await expect(page.locator('.reviews-summary')).toContainText('2 items found');
    await page.getByRole('link', { name: 'Clear search/filters' }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.locator('.reviews-summary')).toContainText('16 items found');
    await expect(page.locator('.reviews-search')).not.toHaveClass(/is-active/);
    await page.goBack();
    await expect(category).toHaveClass(/is-active/);
    await page.goto('/shop');
    const price = page
      .locator('details')
      .filter({ has: page.locator('summary', { hasText: 'Price' }) });
    await price.locator('summary').click();
    await price.getByLabel('Minimum price (USD)', { exact: true }).fill('20');
    await price.getByLabel('Maximum price (USD)', { exact: true }).fill('25');
    await expect(page.locator('.reviews-search')).not.toHaveClass(/is-active/);
    await price.getByRole('button', { name: 'Apply price' }).click();
    await expect(page).toHaveURL(/min_price=20/);
    await expect(page.locator('.reviews-summary')).toContainText('3 items found');
    await page.getByLabel('Sort', { exact: true }).selectOption('price_desc');
    await expect(page).toHaveURL(/sort=price_desc/);
    await expect(page).toHaveURL(/max_price=25/);
    for (const details of await page.locator('details').all())
      await details.locator('summary').click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
}

test('search-only and empty search states on shop and reviews', async ({ page }) => {
  for (const route of ['/shop', '/reviews']) {
    await page.goto(route);
    await expect(page.locator('.reviews-search')).not.toHaveClass(/is-active/);
    await page.locator('#archiveSearch').fill('jeans');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Clear search/filters' })).toBeVisible();
    await expect(page.locator('.reviews-search')).not.toHaveClass(/is-active/);
    await page.getByRole('link', { name: 'Clear search/filters' }).click();
    await expect(page.locator('#archiveSearch')).toHaveValue('');
    await expect(page.getByRole('link', { name: 'Clear search/filters' })).toHaveCount(0);
  }
});

test('filter selections leave search inactive and multiple selections survive history', async ({
  page,
}) => {
  for (const query of ['size=16', 'brand=Sample+label+A', 'min_price=20', 'max_price=30']) {
    await page.goto('/shop?' + query);
    await expect(page.locator('.reviews-search')).not.toHaveClass(/is-active/);
  }
  await page.goto('/shop?category=jeans');
  const category = page
    .locator('details')
    .filter({ has: page.locator('summary', { hasText: 'Category' }) });
  await category.locator('summary').click();
  await category.getByLabel('Tops', { exact: true }).check();
  await expect(page).toHaveURL(/category=jeans/);
  await expect(page).toHaveURL(/category=tops/);
  await expect(page.locator('.reviews-summary')).toContainText('6 items found');
  await page.reload();
  await category.locator('summary').click();
  await expect(category.getByLabel('Jeans', { exact: true })).toBeChecked();
  await expect(category.getByLabel('Tops', { exact: true })).toBeChecked();
  await page.goBack();
  await expect(page.locator('.reviews-summary')).toContainText('2 items found');
});

test('archive updates preserve the document, scroll, focus, and URL history', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto('/shop');
  await expect(page.locator('.reviews-summary')).toContainText('16 items found');
  await page.evaluate(() => {
    document.documentElement.dataset.navigationMarker = 'same-document';
  });
  const category = page
    .locator('details')
    .filter({ has: page.locator('summary', { hasText: 'Category' }) });
  await category.locator('summary').click();
  const jeans = category.getByLabel('Jeans', { exact: true });
  await jeans.focus();
  const before = await page.evaluate(() => scrollY);
  await page.keyboard.press('Space');
  await expect(page.locator('.reviews-summary')).toContainText('2 items found');
  await expect(jeans).toBeFocused();
  await expect(category).toHaveAttribute('open', '');
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(before, 0);
  await expect(page.locator('html')).toHaveAttribute('data-navigation-marker', 'same-document');
  await category.locator('summary').click();
  await page.locator('#archiveSearch').fill('jeans');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/q=jeans/);
  await page.getByRole('link', { name: 'Clear search/filters' }).click();
  await expect(page.locator('.reviews-summary')).toContainText('16 items found');
  await expect(page.locator('#archiveSearch')).toHaveValue('');
  await expect(jeans).not.toBeChecked();
  await page.goBack();
  await expect(page.locator('#archiveSearch')).toHaveValue('jeans');
  await expect(jeans).toBeChecked();
  await page.goForward();
  await expect(page.locator('#archiveSearch')).toHaveValue('');
  await page.getByRole('link', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('.reviews-summary')).toContainText('Page 2 of 2');
  await expect(page.locator('html')).toHaveAttribute('data-navigation-marker', 'same-document');
});

for (const width of [1440, 390]) {
  test(`dropdowns dismiss outside and keep inside interactions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/shop');
    const category = page
      .locator('details')
      .filter({ has: page.locator('summary', { hasText: 'Category' }) });
    const size = page
      .locator('details')
      .filter({ has: page.locator('summary', { hasText: 'Size' }) });
    await category.locator('summary').click();
    await category.getByLabel('Jeans', { exact: true }).check();
    await expect(page.locator('.reviews-summary')).toContainText('2 items found');
    await expect(category).toHaveAttribute('open', '');
    await size.locator('summary').click();
    await expect(category).not.toHaveAttribute('open', '');
    await expect(size).toHaveAttribute('open', '');
    await page.locator('#archiveSearch').click();
    await expect(size).not.toHaveAttribute('open', '');
    await expect(page.locator('#archiveSearch')).toBeFocused();
    await category.locator('summary').click();
    await category.getByLabel('Jeans', { exact: true }).focus();
    await page.locator('.reviews-summary').click();
    await expect(category).not.toHaveAttribute('open', '');
    await expect(category.getByLabel('Jeans', { exact: true })).not.toBeFocused();
  });
}

test('product result transitions respect reduced motion', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.matches('.reviews-grid')) {
        const root = document.documentElement;
        root.dataset.productAnimationCount = String(
          Number(root.dataset.productAnimationCount || 0) + 1,
        );
      }
      return original.apply(this, args);
    };
  });
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/shop');
    const category = page
      .locator('details')
      .filter({ has: page.locator('summary', { hasText: 'Category' }) });
    await category.locator('summary').click();
    await category.getByLabel('Jeans', { exact: true }).check();
    await expect(page.locator('.reviews-summary')).toContainText('2 items found');
    if (reducedMotion === 'no-preference') {
      await expect(page.locator('html')).toHaveAttribute('data-product-animation-count', '1');
      await page.locator('.reviews-grid').evaluate(async (grid) => {
        await Promise.all(grid.getAnimations().map((animation) => animation.finished));
      });
    } else {
      await expect(page.locator('html')).not.toHaveAttribute('data-product-animation-count');
    }
    await expect(page.locator('.reviews-grid')).toHaveCSS('opacity', '1');
  }
});
