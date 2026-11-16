import { expect, test } from '@playwright/test';

const staticRoutes = [
  ['/reviews', 'Reviews'],
  ['/shop', 'Shop the Looks'],
  ['/shop/closet', 'My Closet'],
  ['/about', 'About'],
  ['/support', 'Support'],
  ['/wishlist', 'Saved Items'],
] as const;

test('interior pages share a compact, accessible breadcrumb below the header', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);

  for (const [route, title] of staticRoutes) {
    await page.goto(route);
    const trail = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(trail).toHaveCount(1);
    await expect(trail.locator('ol > li')).toHaveCount(2);
    await expect(trail.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    await expect(trail.locator('[aria-current="page"]')).toHaveText(title);
    await expect(trail.getByRole('link', { name: title })).toHaveCount(0);
    expect(
      await page.evaluate(() => {
        const trail = document.querySelector('.breadcrumbs');
        const header = document.querySelector('header');
        return (
          !!trail &&
          !!header &&
          trail.getBoundingClientRect().top >= header.getBoundingClientRect().bottom - 1
        );
      }),
    ).toBe(true);
  }

  await page.locator('.breadcrumbs [aria-current="page"]').evaluate((element) => {
    element.textContent = 'A very long editorial title about an outfit that should stay within the mobile viewport';
  });
  expect(
    await page.locator('.breadcrumbs').evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= window.innerWidth;
    }),
  ).toBe(true);
});

test('Look breadcrumb uses the document title and matching structured data', async ({ page }) => {
  await page.goto('/shop');
  const card = page.locator('.look-card').first();
  test.skip((await card.count()) === 0, 'No published Look available.');
  const title = await card.locator('h2').innerText();
  await card.locator('h2 a').click();
  const trail = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(trail.getByRole('link', { name: 'Shop the Looks' })).toHaveAttribute(
    'href',
    '/shop',
  );
  await expect(trail.locator('[aria-current="page"]')).toHaveText(title);
  await expect(trail.locator('ol > li')).toHaveCount(3);
  const data = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts
        .map((script) => JSON.parse(script.textContent || '{}'))
        .find((value) => value['@type'] === 'BreadcrumbList'),
    );
  if (data) {
    expect(data.itemListElement.map((item: { name: string }) => item.name)).toEqual([
      'Home',
      'Shop the Looks',
      title,
    ]);
    expect(data.itemListElement.at(-1).item).toMatch(/^https?:\/\//);
  }
});

test('Review breadcrumb uses the review title rather than its slug', async ({ page }) => {
  await page.goto('/reviews');
  const review = page.locator('.review-card').first();
  test.skip((await review.count()) === 0, 'No published Review available.');
  const link = review.locator('h2 a').first();
  const title = await link.innerText();
  await link.click();
  const trail = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(trail.getByRole('link', { name: 'Reviews' })).toHaveAttribute('href', '/reviews');
  await expect(trail.locator('[aria-current="page"]')).toHaveText(title);
  await expect(trail.locator('ol > li')).toHaveCount(3);
});
