import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for (const width of [1440, 390]) {
  test(`core routes and accessibility at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const route of [
      '/',
      '/about',
      '/reviews',
      '/blog',
      '/shop',
      '/my-faves',
      '/privacy',
    ]) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      ).toEqual([]);
    }
  });
}
test('search and filters survive refresh and browser navigation', async ({ page }) => {
  await page.goto('/reviews');
  await page.getByLabel('Search reviews', { exact: true }).fill('jeans');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/reviews\?q=jeans/);
  await expect(page.locator('.reviews-summary [role="status"]')).toContainText(/\d+ reviews? found/);
  await page.reload();
  await expect(page.locator('#archiveSearch')).toHaveValue('jeans');
  await page.getByRole('link', { name: 'Clear filters' }).click();
  await expect(page).toHaveURL(/\/reviews$/);
  await expect(page.getByRole('link', { name: 'Clear filters' })).toHaveCount(0);
  await page.goBack();
  await expect(page.locator('#archiveSearch')).toHaveValue('jeans');
  await page.goto('/reviews?q=no-such-review');
  await expect(page.getByRole('heading', { name: 'Nothing fits this search.' })).toBeVisible();
});
test('request dialog traps keyboard focus, closes with Escape and restores focus', async ({
  page,
}) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Request a Review', exact: true }).first();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Request a review', exact: true });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBeTruthy();
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.route('**/api/forms', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Newsletter is unavailable. Nothing was submitted.' }),
    }),
  );
  await page.locator('#newsletterEmail').fill('reader@example.test');
  await page.getByRole('button', { name: 'Subscribe', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Nothing was submitted' })).toBeVisible();
});
test('Studio is absent from navigation and draft endpoint fails closed', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page.locator('nav a[href*="studio"]')).toHaveCount(0);
  const response = await request.get('/api/draft/enable');
  expect([401, 503]).toContain(response.status());
  expect(response.headers()['set-cookie']).toBeUndefined();
  await page.goto('/studio');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
test('form API rejects invalid input and cross-origin requests', async ({ request, baseURL }) => {
  const invalid = await request.post('/api/forms', {
    headers: { origin: baseURL || 'http://localhost:3000' },
    data: { kind: 'request', email: 'bad', product: '' },
  });
  expect(invalid.status()).toBe(400);
  const foreign = await request.post('/api/forms', {
    headers: { origin: 'https://foreign.example' },
    data: { kind: 'newsletter', email: 'a@example.test' },
  });
  expect(foreign.status()).toBe(403);
});
test('mobile dropdown filters preserve URL state and close with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/reviews');
  const brand = page
    .locator('details')
    .filter({ has: page.locator('summary', { hasText: 'Brand' }) });
  await brand.locator('summary').click();
  const firstBrand = brand.locator('input[type="checkbox"]').first();
  if (await firstBrand.count()) {
    await firstBrand.check();
    await expect(page).toHaveURL(/brand=/);
    await brand.locator('summary').click();
    await expect(firstBrand).toBeChecked();
    await firstBrand.focus();
  } else {
    await expect(brand.getByText('No options yet.')).toBeVisible();
    await brand.locator('summary').focus();
  }
  await page.keyboard.press('Escape');
  await expect(brand).not.toHaveAttribute('open', '');
  await expect(brand.locator('summary')).toBeFocused();
  await page.getByLabel('Sort by', { exact: true }).selectOption('title');
  await expect(page).toHaveURL(/sort=title/);
  if (await firstBrand.count()) await expect(page).toHaveURL(/brand=/);
});
