import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [1440, 390]) {
  test(`email feedback in newsletter and review request at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    let submissions = 0;
    await page.route('**/api/forms', (route) => {
      submissions++;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Accepted by test provider.' }),
      });
    });
    await page.goto('/about');
    for (const kind of ['newsletter', 'request']) {
      if (kind === 'request') {
        await page.getByRole('button', { name: 'Request a Review', exact: true }).first().click();
        await page.locator('#reqProduct').fill('Linen blouse');
      }
      const form = page.locator(kind === 'request' ? '.request-form' : '.newsletter__form');
      const input = form.locator('input[type=email]');
      const control = form.locator('.email-control');
      const tick = form.locator('.email-control__tick');
      await expect(control).toHaveAttribute('data-validation', 'neutral');
      await expect(tick).toHaveCSS('opacity', '0');
      await input.fill('reader@localhost');
      await expect(control).toHaveAttribute('data-validation', 'invalid');
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await expect(input).toHaveCSS('border-top-color', 'rgb(199, 77, 88)');
      await form.locator('button[type=submit]').click();
      expect(submissions).toBe(kind === 'newsletter' ? 0 : 1);
      await input.fill('reader@example.test');
      await expect(control).toHaveAttribute('data-validation', 'valid');
      await expect(tick).toHaveCSS('opacity', '1');
      await expect(input).not.toHaveAttribute('aria-invalid');
      await expect(page.locator(`#${kind}EmailFeedback`)).toHaveText('Email format looks valid.');
      await input.fill('reader');
      await expect(control).toHaveAttribute('data-validation', 'invalid');
      await input.fill('');
      await expect(control).toHaveAttribute('data-validation', 'neutral');
      await input.press('Tab');
      await expect(control).toHaveAttribute('data-validation', 'invalid');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await input.fill('reader@example.test');
      expect(
        await tick.evaluate((node) =>
          Math.max(
            ...getComputedStyle(node)
              .transitionDuration.split(',')
              .map((value) => parseFloat(value)),
          ),
        ),
      ).toBeLessThanOrEqual(0.00001);
      expect(
        (
          await new AxeBuilder({ page })
            .include(kind === 'request' ? '.request-form' : '.newsletter__form')
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
            .analyze()
        ).violations.map((v) => v.id),
      ).toEqual([]);
      await form.locator('button[type=submit]').click();
      await expect(form.getByRole('status')).toContainText('Accepted by test provider.');
      await expect(control).toHaveAttribute('data-validation', 'neutral');
      await expect(tick).toHaveCSS('opacity', '0');
      await expect(input).toHaveValue('');
    }
    expect(submissions).toBe(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
  });
}
